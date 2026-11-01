import assert from 'node:assert/strict';
import { it } from 'node:test';
import { spawnSync } from 'node:child_process';
import { nextWeeklyRefreshAt } from './weeklyRefresh.ts';

it('relit dimanche à 20 h Paris en hiver et en été', () => {
  for (const [now, expected] of [
    ['2026-11-01T18:59:59Z', '2026-11-01T19:00:00Z'],
    ['2026-07-05T17:59:59Z', '2026-07-05T18:00:00Z'],
    ['2026-03-28T20:00:00Z', '2026-03-29T18:00:00Z'],
    ['2026-10-24T20:00:00Z', '2026-10-25T19:00:00Z'],
    ['2026-10-18T18:00:00Z', '2026-10-25T19:00:00Z'],
    ['2026-10-25T19:00:00Z', '2026-11-01T19:00:00Z'],
  ]) assert.equal(nextWeeklyRefreshAt(Date.parse(now)), Date.parse(expected));
});

it('termine même si le moteur natif ignore hourCycle et utilise un cadran de 12 heures', () => {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    const NativeFormatter = Intl.DateTimeFormat;
    Intl.DateTimeFormat = class extends NativeFormatter {
      constructor(_locale, options) { super('en-US', { ...options, hourCycle: undefined }); }
    };
    const { nextWeeklyRefreshAt } = await import(${JSON.stringify(new URL('./weeklyRefresh.ts', import.meta.url).href)});
    process.stdout.write(String(nextWeeklyRefreshAt(Date.parse('2026-11-02T08:15:00Z'))));
  `], { timeout: 1500, encoding: 'utf8' });
  assert.equal(child.error, undefined, 'Le calcul de la relecture ne doit jamais bloquer le thread JS');
  assert.equal(child.status, 0, child.stderr);
  assert.equal(Number(child.stdout), Date.parse('2026-11-08T19:00:00Z'));
});

it('se replie sur une relecture horaire si le format natif reste inexploitable', () => {
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
    Intl.DateTimeFormat = class extends Intl.DateTimeFormat {
      formatToParts() { return []; }
    };
    const { nextWeeklyRefreshAt } = await import(${JSON.stringify(new URL('./weeklyRefresh.ts', import.meta.url).href)});
    process.stdout.write(String(nextWeeklyRefreshAt(Date.parse('2026-11-03T12:15:00Z'))));
  `], { timeout: 1500, encoding: 'utf8' });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(Number(child.stdout), Date.parse('2026-11-03T13:00:00Z'));
});
