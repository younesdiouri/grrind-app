import assert from 'node:assert/strict';
import { test } from 'node:test';
import duel from '../../../fixtures/battle/duel-equipped.json' with { type: 'json' };
import boss from '../../../fixtures/battle/defaite-boss.json' with { type: 'json' };
import { contactAt, type PoseSignals } from './fighterMotion.ts';
import { buildBattleTimeline, type Actor, type Battle } from './timeline.ts';
import { unityActorFrame, unityAvatarOf } from './unityFrame.ts';

const timeline = buildBattleTimeline(boss as unknown as Battle, { illustrated: true });
function signals(actor: Actor): PoseSignals {
  const own = actor === 'PLAYER' ? timeline.player : timeline.enemy;
  const target = actor === 'PLAYER' ? timeline.enemy : timeline.player;
  return { critical: target.criticalFlash, dodge: own.dodgeFlash, combo: own.comboFlash, replay: own.replayFlash };
}

test('Unity prepares the attack before the server contact and reaches contact with the HUD', () => {
  const beat = timeline.beats.find((entry) => entry.kind === 'attack');
  assert.ok(beat && beat.kind === 'attack');
  const target = beat.attacker === 'PLAYER' ? 'ENEMY' : 'PLAYER';
  const contact = contactAt(beat);
  const windup = unityActorFrame(timeline.beats, beat.attacker, beat.at + 1, signals(beat.attacker), 500, true, false);
  assert.notEqual(windup.pose, 0);
  assert.ok(windup.phase < .5);
  assert.equal(unityActorFrame(timeline.beats, target, contact - 1, signals(target), 500, true, false).pose, 0);
  assert.equal(unityActorFrame(timeline.beats, beat.attacker, contact, signals(beat.attacker), 500, true, false).phase, .5);
  assert.equal(unityActorFrame(timeline.beats, target, contact, signals(target), 500, true, false).pose, 2);
});

test('a dodge belongs to the defender, with reduced motion preserving a fixed pose', () => {
  const beat = timeline.beats.find((entry) => entry.kind === 'dodge');
  assert.ok(beat && beat.kind === 'dodge');
  const time = (beat.at + beat.until) / 2;
  const dodge = unityActorFrame(timeline.beats, beat.dodger, time, signals(beat.dodger), 500, true, true);
  assert.equal(dodge.pose, 4);
  assert.equal(dodge.phase, .5);
  assert.equal(dodge.x, 0);
  assert.notEqual(unityActorFrame(timeline.beats, beat.attacker, time, signals(beat.attacker), 500, true, false).pose, 4);
});

test('skip to verdict leaves no attack or movement running', () => {
  const result = unityActorFrame(timeline.beats, 'PLAYER', timeline.duration, signals('PLAYER'), 0, false, false);
  assert.equal(result.pose, 0);
  assert.equal(result.x, 0);
  assert.equal(result.visible, false);
});

test('equipped 3D objects come from this fight snapshot', () => {
  assert.equal(unityAvatarOf(duel.player).weapon, true);
  assert.equal(unityAvatarOf(duel.player).glasses, true);
  assert.equal(unityAvatarOf(duel.enemy).weapon, false);
  assert.equal(unityAvatarOf(duel.enemy).glasses, false);
});
