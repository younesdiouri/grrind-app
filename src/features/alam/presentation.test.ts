import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { components } from '@/api/schema';
import { raidBeats } from './presentation.ts';

it('ne transforme que les efforts et défaites livrés en mouvements du sprite', () => {
  const events: components['schemas']['AlamEvent'][] = [
    { id: '1', offsetMs: 0, encounterIndex: 1, action: 'ARRIVAL', actorId: null, targetId: null, text: 'Arrivée' },
    { id: '2', offsetMs: 1000, encounterIndex: 1, action: 'EFFORT', actorId: 'a', targetId: null, text: 'Effort' },
    { id: '3', offsetMs: 4000, encounterIndex: 1, action: 'DEFEAT', actorId: null, targetId: null, text: 'Défaite' },
    { id: '4', offsetMs: 5000, encounterIndex: 1, action: 'DROP', actorId: 'a', targetId: null, text: 'Ressource' },
  ];
  const beats = raidBeats(events);
  assert.equal(beats.length, 2);
  assert.equal(beats[0].at, 1000);
  assert.equal(beats[1].at, 4000);
  assert.deepEqual(events.map((event) => event.action), ['ARRIVAL', 'EFFORT', 'DEFEAT', 'DROP']);
});
