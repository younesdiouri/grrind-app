import assert from 'node:assert/strict';
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
  assert.equal(pruneReports(root, 1), 1);
  assert.ok(existsSync(resolve(root, '2026-10-05_120000')));
  assert.equal(existsSync(resolve(root, '2026-10-05_110000')), false);
  assert.equal(readFileSync(resolve(root, 'dev/native-fingerprint'), 'utf8'), 'keep');
  assert.equal(pruneReports(root, 1), 0);
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
      cwd: root, encoding: 'utf8', env: { ...process.env, APP_VARIANT: 'e2e' },
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
