import assert from 'node:assert/strict';
import { it } from 'node:test';
import { nextWeeklyRefreshAt } from './weeklyRefresh.ts';

it('relit dimanche à 20 h Paris en hiver et en été', () => {
  for (const [now, expected] of [
    ['2026-11-01T18:59:59Z', '2026-11-01T19:00:00Z'],
    ['2026-07-05T17:59:59Z', '2026-07-05T18:00:00Z'],
    ['2026-03-28T20:00:00Z', '2026-03-29T18:00:00Z'],
    ['2026-10-24T20:00:00Z', '2026-10-25T19:00:00Z'],
    ['2026-10-25T19:00:00Z', '2026-11-01T19:00:00Z'],
  ]) assert.equal(nextWeeklyRefreshAt(Date.parse(now)), Date.parse(expected));
});
