import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { components } from '@/api/schema';
import { raidFrameAt } from './unityRaid.ts';

const events: components['schemas']['AlamEvent'][] = [
  { id: 'a', offsetMs: 0, encounterIndex: 1, action: 'ARRIVAL', actorId: null, targetId: null, text: '' },
  { id: 'b', offsetMs: 1000, encounterIndex: 1, action: 'EFFORT', actorId: 'sara', targetId: null, text: '' },
  { id: 'c', offsetMs: 3000, encounterIndex: 1, action: 'VICTORY', actorId: null, targetId: null, text: '' },
  { id: 'd', offsetMs: 4500, encounterIndex: 2, action: 'ARRIVAL', actorId: null, targetId: null, text: '' },
  { id: 'e', offsetMs: 5500, encounterIndex: 2, action: 'EFFORT', actorId: 'absent', targetId: null, text: '' },
  { id: 'f', offsetMs: 7000, encounterIndex: 2, action: 'DEFEAT', actorId: null, targetId: null, text: '' },
];
const ids = ['younes', 'sara'];

it('anime uniquement l’auteur de l’effort et aligne sa frappe au contact', () => {
  const frame = raidFrameAt(events, ids, 1450, 2, false);
  assert.equal(frame.heroes[0].pose, 0);
  assert.equal(frame.heroes[1].pose, 1);
  assert.equal(frame.heroes[1].phase, .5);
  assert.equal(frame.hit, 1);
  assert.equal(frame.boss, false);
});

it('rejoue une arrivée sans conserver le verdict de la rencontre précédente', () => {
  assert.equal(raidFrameAt(events, ids, 3200, 2, false).verdict, 1);
  const frame = raidFrameAt(events, ids, 4500, 2, false);
  assert.equal(frame.verdict, 0);
  assert.equal(frame.encounter, 2);
  assert.equal(frame.boss, true);
  assert.equal(frame.arrival, 0);
  assert.deepEqual(raidFrameAt(events, ids, 1450, 2, false), raidFrameAt(events, ids, 1450, 2, false));
});

it('ne prête pas l’effort d’un acteur absent à un autre joueur', () => {
  const frame = raidFrameAt(events, ids, 5950, 2, false);
  assert.ok(frame.heroes.every((hero) => hero.pose === 0));
  assert.equal(frame.hit, 0);
});

it('montre la défaite serveur et conserve les mêmes événements en mouvements réduits', () => {
  const snapshot = structuredClone(events);
  const frame = raidFrameAt(events, ids, 7200, 2, true);
  assert.equal(frame.verdict, -1);
  assert.equal(frame.reduced, true);
  assert.equal(frame.hit, 0);
  assert.deepEqual(events, snapshot);
  assert.equal(raidFrameAt([], [], 0, 0, false).verdict, 0);
});
