import assert from 'node:assert/strict';
import { it } from 'node:test';
import { combatMotion } from '@/design/tokens';
import { IMPACT } from './camera.ts';
import { burstAt, sparkAt } from './sparks.ts';

const impacts = [{ at: 100, strength: IMPACT.blow, target: 'ENEMY' as const }, { at: 300, strength: IMPACT.final, target: 'PLAYER' as const }];

it('une gerbe naît au contact, la suivante la chasse, et elle s’éteint au bout de sa vie', () => {
  assert.equal(burstAt(impacts, 99), undefined);
  assert.equal(burstAt(impacts, 150)!.impact.target, 'ENEMY');
  assert.equal(burstAt(impacts, 300)!.impact.target, 'PLAYER');
  assert.equal(burstAt(impacts, 300 + combatMotion.sparkLife), undefined);
});

it('les étincelles partent du point d’impact, s’écartent puis s’éteignent, toujours au même endroit', () => {
  const start = sparkAt(3, 22, 0, IMPACT.blow);
  assert.equal(Math.hypot(start.x, start.y), 0);
  const mid = sparkAt(3, 22, 0.5, IMPACT.blow);
  assert.ok(Math.hypot(mid.x, mid.y) > 0);
  assert.deepEqual(sparkAt(3, 22, 0.5, IMPACT.blow), mid);
  assert.equal(sparkAt(3, 22, 1, IMPACT.blow).radius, 0);
  assert.ok(Math.hypot(...Object.values(sparkAt(3, 22, 0.5, IMPACT.final)).slice(0, 2)) > Math.hypot(mid.x, mid.y));
});
