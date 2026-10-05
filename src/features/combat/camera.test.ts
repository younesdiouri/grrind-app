import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readFileSync } from 'node:fs';
import { combatMotion, duration } from '@/design/tokens';
import { buildBattleTimeline, type Battle } from './timeline.ts';
import { cameraAt, IMPACT } from './camera.ts';

const still = { x: 0, y: 0, scale: 1 };
const battle = JSON.parse(readFileSync(new URL('../../../fixtures/battle/victoire.json', import.meta.url), 'utf8')) as Battle;

it('tremble après un impact, plus fort sur un critique, puis se pose', () => {
  const at = 1000;
  const blow = cameraAt([{ at, strength: IMPACT.blow, target: 'ENEMY' as const }], at + 10, false);
  const critical = cameraAt([{ at, strength: IMPACT.critical, target: 'ENEMY' as const }], at + 10, false);
  assert.notDeepEqual(blow, still);
  assert.ok(Math.abs(critical.y) > Math.abs(blow.y));
  assert.deepEqual(cameraAt([{ at, strength: IMPACT.blow, target: 'ENEMY' as const }], at + combatMotion.shakeDuration, false), still);
  assert.deepEqual(cameraAt([{ at, strength: IMPACT.blow, target: 'ENEMY' as const }], at - 1, false), still);
});

it('s’approche sur le coup final et revient', () => {
  const impacts = [{ at: 0, strength: IMPACT.final, target: 'ENEMY' as const }];
  assert.ok(cameraAt(impacts, duration.flip / 2, false).scale > 1);
  assert.equal(cameraAt(impacts, duration.flip, false).scale, 1 + Math.sin(Math.PI) * combatMotion.finalZoom);
});

it('reste immobile sous Réduire les animations', () => {
  assert.deepEqual(cameraAt([{ at: 0, strength: IMPACT.final, target: 'ENEMY' as const }], 10, true), still);
});

it('la timeline pose un impact par coup porté, et le dernier d’un KO est le coup final', () => {
  const timeline = buildBattleTimeline(battle, { illustrated: true });
  assert.deepEqual(timeline.impacts.map((impact) => impact.at), timeline.blows);
  assert.equal(timeline.impacts.at(-1)!.strength, IMPACT.final);
  assert.equal(timeline.impacts.filter((impact) => impact.strength === IMPACT.final).length, 1);
});

it('le chiffre jaillit au contact et monte jusqu’à la fin du battement', () => {
  const timeline = buildBattleTimeline(battle, { illustrated: true });
  const beat = timeline.beats.find((b) => b.kind === 'attack' && b.attacker === 'PLAYER')!;
  const rise = timeline.enemy.rise;
  const start = rise.input.indexOf(timeline.blows[0] + 1);
  assert.equal(rise.output[start], 0);
  assert.equal(rise.output[rise.input.indexOf(beat.until)], 1);
});
