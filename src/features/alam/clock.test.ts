import assert from 'node:assert/strict';
import { it } from 'node:test';
import { presentationOffset, eventIndexAt, opensAsReplay } from './clock.ts';

it('reprend à l’instant serveur malgré une horloge appareil décalée', () => {
  assert.equal(presentationOffset('2026-09-14T17:00:00Z', '2026-09-14T17:00:25Z', 1000, 4000, 60000), 28000);
});
it('borne avant le début et après la fin, sans relancer un raid terminé', () => {
  assert.equal(presentationOffset('2026-09-14T17:00:00Z', '2026-09-14T16:59:00Z', 0, 0, 60000), 0);
  assert.equal(presentationOffset('2026-09-14T17:00:00Z', '2026-09-14T18:00:00Z', 0, 0, 60000), 60000);
});
it('ne révèle jamais un événement futur et garde le dernier visible', () => {
  const events = [{ offsetMs: 100 }, { offsetMs: 300 }, { offsetMs: 500 }];
  assert.equal(eventIndexAt(events, 0), -1);
  assert.equal(eventIndexAt(events, 300), 1);
  assert.equal(eventIndexAt(events, 999), 2);
});

it('rejoue une édition rouverte après sa minute en direct, et pas celle qui se joue', () => {
  assert.equal(opensAsReplay('2026-09-14T17:00:00Z', '2026-09-14T17:00:25Z', 1000, 4000, 60000), false);
  assert.equal(opensAsReplay('2026-09-14T17:00:00Z', '2026-09-14T17:05:00Z', 0, 0, 60000), true);
});
