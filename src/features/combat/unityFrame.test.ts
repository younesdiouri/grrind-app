import assert from 'node:assert/strict';
import { test } from 'node:test';
import { combatMotion } from '@/design/tokens';
import boss from '../../../fixtures/battle/defaite-boss.json' with { type: 'json' };
import { contactAt, type PoseSignals } from './fighterMotion.ts';
import { buildBattleTimeline, type Actor, type Battle } from './timeline.ts';
import { unityActorFrame } from './unityFrame.ts';

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
  assert.equal(unityActorFrame(timeline.beats, target, contact, signals(target), 500, true, false).phase, .5);
  const recovered = beat.at + (beat.until - beat.at) * combatMotion.recover;
  const recovery = unityActorFrame(timeline.beats, target, recovered - 1, signals(target), 500, true, false);
  assert.equal(recovery.pose, 2);
  assert.ok(recovery.phase > .99);
  assert.equal(unityActorFrame(timeline.beats, target, recovered, signals(target), 500, true, false).pose, 0);
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

test('each ordinary action stays readable even in a very long battle', () => {
  const ordinary = timeline.beats.filter((beat) => beat.kind === 'attack');
  assert.ok(ordinary.every((beat) => beat.until - beat.at >= 900));
  assert.ok(timeline.tempo >= 1200);
});

test('both fighters return to guard before the following action', () => {
  for (const beat of timeline.beats) {
    if (beat.kind !== 'attack' && beat.kind !== 'dodge') continue;
    const resting = beat.until - 50;
    for (const side of ['PLAYER', 'ENEMY'] as const) {
      const frame = unityActorFrame(timeline.beats, side, resting, signals(side), 500, true, false);
      assert.equal(frame.pose, 0);
      assert.equal(frame.x, 0);
    }
  }
});

test('Unity holds the actual striking pose briefly at contact', () => {
  const beat = timeline.beats.find((entry) => entry.kind === 'attack');
  assert.ok(beat && beat.kind === 'attack');
  const held = unityActorFrame(timeline.beats, beat.attacker, contactAt(beat) + 40,
    signals(beat.attacker), 500, true, false);
  assert.equal(held.phase, .5);
});

test('Unity attacks from its calibrated position without a screen-dependent lunge', () => {
  for (const beat of timeline.beats) {
    if (beat.kind !== 'attack' && beat.kind !== 'dodge') continue;
    for (const width of [500, 900]) {
      for (const progress of [.1, .5, .8]) {
        const time: number = beat.at + (beat.until - beat.at) * progress;
        assert.equal(unityActorFrame(timeline.beats, beat.attacker, time,
          signals(beat.attacker), width, true, false).x, 0);
      }
    }
  }
});
