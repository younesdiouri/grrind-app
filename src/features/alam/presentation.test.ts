import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { components } from '@/api/schema';
import { alamMotion } from '@/design/tokens';
import { IMPACT } from '@/features/combat/camera';
import { frontRow, raidBeats, raidImpacts } from './presentation.ts';

const events: components['schemas']['AlamEvent'][] = [
  { id: '1', offsetMs: 0, encounterIndex: 1, action: 'ARRIVAL', actorId: null, targetId: null, text: 'Arrivée' },
  { id: '2', offsetMs: 1000, encounterIndex: 1, action: 'EFFORT', actorId: 'a', targetId: null, text: 'Effort' },
  { id: '3', offsetMs: 1500, encounterIndex: 1, action: 'EFFORT', actorId: 'b', targetId: null, text: 'Effort' },
  { id: '4', offsetMs: 4000, encounterIndex: 1, action: 'DEFEAT', actorId: null, targetId: null, text: 'Défaite' },
  { id: '5', offsetMs: 5000, encounterIndex: 1, action: 'DROP', actorId: 'a', targetId: null, text: 'Ressource' },
  { id: '6', offsetMs: 6000, encounterIndex: 2, action: 'VICTORY', actorId: null, targetId: null, text: 'Victoire' },
];

it('ne transforme que les efforts et défaites livrés en mouvements du sprite', () => {
  const beats = raidBeats(events);
  assert.deepEqual(beats.map((beat) => beat.at), [1000, 1500, 4000]);
  assert.deepEqual(events.map((event) => event.action), ['ARRIVAL', 'EFFORT', 'EFFORT', 'DEFEAT', 'DROP', 'VICTORY']);
});

it('un membre ne s’élance que sur ses propres efforts, et encaisse les défaites', () => {
  const beats = raidBeats(events, 'a');
  assert.deepEqual(beats.map((beat) => beat.kind === 'attack' && beat.attacker), ['PLAYER', 'ENEMY']);
  assert.equal(beats[0].at, 1000);
});

it('les impacts suivent le journal : efforts sur le boss, défaite sur la guilde, victoire en coup final', () => {
  const impacts = raidImpacts(events);
  assert.deepEqual(impacts.map((impact) => [impact.target, impact.strength]),
    [['ENEMY', IMPACT.blow], ['ENEMY', IMPACT.blow], ['PLAYER', IMPACT.critical], ['ENEMY', IMPACT.final]]);
  assert.ok(impacts.every((impact, index) => index === 0 || impacts[index - 1].at <= impact.at));
});

it('le premier rang prend les plus gros contributeurs, les autres restent derrière', () => {
  const members = Array.from({ length: alamMotion.frontRow + 2 }, (_, index) => ({ playerId: String(index), contribution: index }));
  const { front, back } = frontRow(members);
  assert.equal(front.length, alamMotion.frontRow);
  assert.equal(front[0].playerId, String(alamMotion.frontRow + 1));
  assert.deepEqual(back.map((member) => member.playerId), ['1', '0']);
});
