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

test('skip to verdict leaves the winner at rest and the knocked-out fighter down (#279)', () => {
  const winner = unityActorFrame(timeline.beats, 'ENEMY', timeline.duration, signals('ENEMY'), 0, false, false);
  assert.equal(winner.pose, 0);
  assert.equal(winner.x, 0);
  const loser = unityActorFrame(timeline.beats, 'PLAYER', timeline.duration, signals('PLAYER'), 0, false, false);
  assert.deepEqual([loser.pose, loser.phase, loser.x, loser.visible], [8, 1, 0, false]);
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
      // The knock-out does not get back up (#279).
      if (beat.kind === 'attack' && beat.final && side !== beat.attacker) continue;
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

test('sword windup advances steadily while fists keep their explosive timing and common contact', () => {
  for (const beat of timeline.beats) {
    if (beat.kind !== 'attack') continue;
    const contact = contactAt(beat);
    const halfway = beat.at + (contact - beat.at) / 2;
    const frame = (time: number, weaponType: 'FIST' | 'SWORD') => unityActorFrame(
      timeline.beats, beat.attacker, time, signals(beat.attacker), 500, true, false, weaponType);
    assert.equal(frame(halfway, 'SWORD').phase, .25);
    assert.ok(frame(halfway, 'FIST').phase < .1);
    for (const family of ['FIST', 'SWORD'] as const) {
      assert.equal(frame(contact, family).phase, .5);
      assert.equal(frame(contact + 40, family).phase, .5);
      assert.equal(frame(contact, family).x, 0);
    }
  }
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

test('the blow freezes at contact for its hit-stop, longer when heavy, then still recovers in its beat', () => {
  const attacks = timeline.beats.filter((beat) => beat.kind === 'attack');
  const normal = attacks.find((beat) => !beat.heavy);
  const heavy = attacks.find((beat) => beat.heavy);
  assert.ok(normal && heavy);
  for (const [beat, stop] of [[normal, combatMotion.hitStop], [heavy, combatMotion.hitStopHeavy]] as const) {
    const contact = contactAt(beat);
    const at = (time: number) => unityActorFrame(timeline.beats, beat.attacker, time, signals(beat.attacker), 500, true, false);
    assert.equal(at(contact + stop - 1).phase, .5);
    assert.ok(at(contact + stop + 20).phase > .5);
    assert.ok(at(beat.at + (beat.until - beat.at) * combatMotion.recover - 1).phase > .99);
  }
  assert.ok(combatMotion.hitStopHeavy > combatMotion.hitStop);
});
