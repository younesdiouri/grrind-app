import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { pruneReports } from './e2e-ios-clean.mjs';

test('retention removes old reports but preserves dev state, pinned proofs and symlinks', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'grrind-retention-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of ['dev', '2026-10-05_100000', '2026-10-05_110000', '2026-10-05_120000']) {
    mkdirSync(resolve(root, name));
  }
  writeFileSync(resolve(root, 'dev/native-fingerprint'), 'keep');
  writeFileSync(resolve(root, '2026-10-05_100000/.keep'), '');
  symlinkSync(resolve(root, 'dev'), resolve(root, '2026-10-05_090000'));
  assert.equal(pruneReports(root), 1);
  assert.ok(existsSync(resolve(root, '2026-10-05_120000')));
  assert.equal(existsSync(resolve(root, '2026-10-05_110000')), false);
  assert.equal(readFileSync(resolve(root, 'dev/native-fingerprint'), 'utf8'), 'keep');
  assert.equal(pruneReports(root, 1), 0);
});

test('retention bounds log size while keeping the end, screenshots and external symlinks', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'grrind-log-retention-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const run = resolve(root, '2026-10-24_100000');
  mkdirSync(resolve(run, 'flow/logs'), { recursive: true });
  const log = resolve(run, 'flow/logs/device-simulator.log');
  const contents = Buffer.concat([Buffer.alloc(5 * 1024 * 1024, 'x'), Buffer.from('\nLast crash details\n')]);
  writeFileSync(log, contents);
  writeFileSync(resolve(root, 'external.log'), contents);
  symlinkSync(resolve(root, 'external.log'), resolve(run, 'flow/logs/external.log'));
  writeFileSync(resolve(run, 'screenshot.png'), 'capture');

  pruneReports(root);

  const retained = readFileSync(log);
  assert.ok(retained.length <= 4 * 1024 * 1024);
  assert.ok(retained.toString().endsWith('\nLast crash details\n'));
  assert.equal(readFileSync(resolve(root, 'external.log')).length, contents.length);
  assert.equal(readFileSync(resolve(run, 'screenshot.png'), 'utf8'), 'capture');
  pruneReports(root);
  assert.deepEqual(readFileSync(log), retained);
});

test('iOS launcher only regenerates a changed variant and forwards device arguments', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'grrind-ios-launcher-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(resolve(root, 'bin')); mkdirSync(resolve(root, 'ios'));
  writeFileSync(resolve(root, 'bin/node'), '#!/bin/sh\nprintf "dev-hash\\n"\n', { mode: 0o755 });
  writeFileSync(resolve(root, 'bin/npx'), '#!/bin/sh\nprintf "%s: %s\\n" "$APP_VARIANT" "$*" >>calls\n', { mode: 0o755 });
  writeFileSync(resolve(root, 'ios/.grrind-native-fingerprint'), 'e2e-hash\n');
  const run = () => spawnSync('/bin/sh', [resolve('scripts/ios-dev.sh'), 'QA-device'], {
    cwd: root, env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}` }, encoding: 'utf8',
  });
  assert.equal(run().status, 0);
  assert.equal(run().status, 0);
  assert.deepEqual(readFileSync(resolve(root, 'calls'), 'utf8').trim().split('\n'), [
    'development: expo prebuild --clean --platform ios',
    'development: expo run:ios --device QA-device',
    'development: expo run:ios --device QA-device',
  ]);
});

test('Expo fingerprint ignores JS tooling but detects Swift and native configuration', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'grrind-fingerprint-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  symlinkSync(resolve('node_modules'), resolve(root, 'node_modules'));
  mkdirSync(resolve(root, 'targets'));
  const pkg = { name: 'qa-fingerprint', version: '1.0.0', dependencies: {
    expo: JSON.parse(readFileSync('node_modules/expo/package.json', 'utf8')).version,
  } };
  const config = { expo: { name: 'QA', slug: 'qa', ios: { bundleIdentifier: 'app.qa' } } };
  const write = () => {
    writeFileSync(resolve(root, 'package.json'), JSON.stringify(pkg));
    writeFileSync(resolve(root, 'app.json'), JSON.stringify(config));
  };
  const hash = () => {
    const result = spawnSync(process.execPath, [resolve('scripts/ios-native-fingerprint.cjs')], {
      cwd: root, encoding: 'utf8', env: { ...process.env, APP_VARIANT: 'development' },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout.trim(), /^[a-f0-9]{40}$/);
    return result.stdout.trim();
  };
  write();
  const initial = hash();
  pkg.scripts = { test: 'node --test' };
  pkg.dependencies['openapi-fetch'] = '0.17.0';
  write();
  writeFileSync(resolve(root, 'package-lock.json'), '{"lockfileVersion":3}');
  writeFileSync(resolve(root, 'screen.tsx'), '// JS-only edit');
  assert.equal(hash(), initial);
  writeFileSync(resolve(root, 'targets/Widget.swift'), 'struct Widget {}');
  const native = hash();
  assert.notEqual(native, initial);
  config.expo.ios.appleTeamId = 'QA12345678';
  write();
  assert.notEqual(hash(), native);
});

test('session cache QA reuses two private accounts without exposing credentials in arguments', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'grrind-cache-qa-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(resolve(root, 'bin'));
  const calls = resolve(root, 'calls.json');
  writeFileSync(resolve(root, 'bin/rtk'), `#!${process.execPath}
require('node:fs').writeFileSync(process.env.QA_CALLS, JSON.stringify({
  args: process.argv.slice(2), offline: process.env.E2E_OFFLINE, api: process.env.E2E_API_URL,
  a: process.env.MAESTRO_CACHE_A_EMAIL, b: process.env.MAESTRO_CACHE_B_EMAIL,
}));
`, { mode: 0o755 });
  const file = resolve(root, 'accounts.json');
  const account = (id, items) => ({ id, email: `qa-empty-${id}@example.test`, password: 'private-password',
    guildName: `QA ${id}`, expectedItemKeys: items, expectedItemNames: items });
  const fixture = { A: account('A', ['item-A']), B: account('B', []),
    baseUrl: 'http://127.0.0.1:18367', toxiproxyControlUrl: 'http://127.0.0.1:18474' };
  writeFileSync(file, JSON.stringify(fixture), { mode: 0o600 });
  const run = () => spawnSync(process.execPath, [resolve('scripts/session-cache-qa-flow.mjs')], {
    encoding: 'utf8', env: { ...process.env, SESSION_CACHE_QA_CREDENTIALS: file,
      PATH: `${root}/bin:${process.env.PATH}`, QA_CALLS: calls },
  });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(calls, 'utf8')), {
    args: ['proxy', 'npm', 'run', 'e2e:ios:flow', '--', '.maestro/session-cache.yaml'],
    offline: '1', api: fixture.baseUrl, a: fixture.A.email, b: fixture.B.email,
  });
  assert.doesNotMatch(result.stdout + result.stderr, /private-password|qa-empty-/);
  fixture.baseUrl = 'https://api.grrind.app';
  writeFileSync(file, JSON.stringify(fixture));
  assert.notEqual(run().status, 0);
});

test('Maestro report output cannot erase the installed dev build and Metro metadata', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'grrind-maestro-output-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(resolve(root, 'bin')); mkdirSync(resolve(root, 'artifacts/e2e/dev'), { recursive: true });
  writeFileSync(resolve(root, 'artifacts/e2e/dev/native-fingerprint'), 'built-fingerprint');
  writeFileSync(resolve(root, 'bin/maestro'), `#!${process.execPath}
const fs = require('node:fs'); const path = require('node:path');
const args = process.argv.slice(2);
const directory = args[args.indexOf('--test-output-dir') + 1];
if (!path.resolve(directory).startsWith(path.join(process.cwd(), 'artifacts/e2e'))) process.exit(2);
fs.rmSync(directory, { recursive: true, force: true });
fs.mkdirSync(directory, { recursive: true });
`, { mode: 0o755 });
  const result = spawnSync('/bin/sh', ['-c', `
. '${resolve('scripts/e2e-ios-common.sh')}'
E2E_SIMULATOR_UDID=qa
E2E_EMPTY_EMAIL=''
E2E_MULTIPLE_EMAIL=''
e2e_run_flow .maestro/session-cache.yaml
`], { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}` } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(resolve(root, 'artifacts/e2e/dev/native-fingerprint'), 'utf8'), 'built-fingerprint');
});

test('Metro without dotenv excludes local API overrides from the SDK57 client graph only when requested', () => {
  const require = createRequire(import.meta.url);
  const configPath = resolve('metro.config.js');
  const previous = process.env.EXPO_NO_DOTENV;
  const excludesLocalEnv = () => {
    delete require.cache[configPath];
    const config = require(configPath);
    return [config.resolver.blockList].flat().some(pattern => pattern?.test(resolve('.env.local')));
  };
  try {
    delete process.env.EXPO_NO_DOTENV;
    assert.equal(excludesLocalEnv(), false);
    process.env.EXPO_NO_DOTENV = '1';
    assert.equal(excludesLocalEnv(), true);
  } finally {
    if (previous === undefined) delete process.env.EXPO_NO_DOTENV;
    else process.env.EXPO_NO_DOTENV = previous;
    delete require.cache[configPath];
  }
});
