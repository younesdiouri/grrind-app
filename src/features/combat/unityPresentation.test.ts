import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildBattleTimeline, type Battle } from './timeline.ts';
import { contactAt } from './fighterMotion.ts';
import { unityPresentationAt } from './unityPresentation.ts';

const battle: Battle = JSON.parse(readFileSync(new URL('../../../fixtures/battle/defaite-boss.json', import.meta.url), 'utf8'));
const timeline = buildBattleTimeline(battle, { illustrated: true });

test('referee opening and audience use the replay clock, and skip suppresses the countdown', () => {
  const opening = timeline.beats[0];
  assert.equal(opening.kind, 'opening');
  const midway = (opening.at + opening.until) / 2;
  assert.equal(unityPresentationAt(timeline, midway, false).opening, .5);
  assert.equal(unityPresentationAt(timeline, midway, false).time, midway / 1000);
  assert.equal(unityPresentationAt(timeline, opening.until, false).opening, -1);
  assert.equal(unityPresentationAt(timeline, midway, true).opening, -1);
  assert.equal(unityPresentationAt(timeline, 0, false).opening, 0);
  assert.equal(unityPresentationAt(timeline, midway, false, true).opening, .5);
});

test('Unity shows exact server damage on the defender at contact and preserves final HP on skip', () => {
  const beat = timeline.beats.find((b) => b.kind === 'attack');
  assert.ok(beat?.kind === 'attack');
  const target = beat.attacker === 'PLAYER' ? 'enemy' : 'player';
  const before = unityPresentationAt(timeline, contactAt(beat) - 1, false);
  assert.equal(before[target].damageOpacity, 0);
  const impact = unityPresentationAt(timeline, contactAt(beat) + 50, false);
  assert.equal(impact[target].damage, beat.damage);
  assert.ok(impact[target].damageOpacity > 0);
  const final = unityPresentationAt(timeline, timeline.duration, true);
  for (const side of ['player', 'enemy'] as const) {
    assert.equal(final[side].hp, timeline[side].hp.output.at(-1));
    assert.equal(final[side].damageOpacity, 0);
    assert.equal(final[side].impact, 0);
  }
});

test('dodge is announced on the dodging fighter with no impact or HP loss', () => {
  const beat = timeline.beats.find((b) => b.kind === 'dodge');
  assert.ok(beat?.kind === 'dodge');
  const target = beat.dodger === 'PLAYER' ? 'player' : 'enemy';
  const frame = unityPresentationAt(timeline, beat.at + 100, false);
  assert.equal(frame[target].effect, 'ESQUIVE');
  assert.equal(frame[target].impact, 0);
  assert.equal(frame[target].damageOpacity, 0);
});

test('reduced motion keeps readable announcements and values, without particles or camera motion', () => {
  const beat = timeline.beats.find((b) => b.kind === 'attack');
  assert.ok(beat?.kind === 'attack');
  const target = beat.attacker === 'PLAYER' ? 'enemy' : 'player';
  const frame = unityPresentationAt(timeline, contactAt(beat) + 100, false, true);
  assert.equal(frame[target].damage, beat.damage);
  assert.ok(frame[target].damageOpacity > 0);
  assert.equal(frame[target].impact, 0);
  assert.equal(frame.shakeX, 0);
  assert.equal(frame.zoom, 1);
});
