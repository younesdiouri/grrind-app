import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildBattleTimeline, type Battle } from './timeline.ts';
import { enemyMotionAt, contactAt } from './enemyMotion.ts';

const fixtures = ['victoire', 'defaite-boss', 'combat-long'].map((name) => JSON.parse(
  readFileSync(new URL(`../../../fixtures/battle/${name}.json`, import.meta.url), 'utf8'),
) as Battle);
const timeline = buildBattleTimeline(fixtures[1], { illustrated: true });
describe('Al-Kasal : mise en scène', () => {
  it('réagit au contact, avec vie et haptique synchronisées', () => {
    const beat = timeline.beats.find((b) => b.kind === 'attack' && b.attacker === 'PLAYER')!;
    const contact = contactAt(beat);
    assert.equal(enemyMotionAt(timeline.beats, contact - 1).pose, 'idle');
    assert.equal(enemyMotionAt(timeline.beats, contact).pose, 'hit');
    assert.ok(timeline.blows.includes(contact));
    const hp = timeline.enemy.hp;
    const index = hp.input.indexOf(contact);
    assert.ok(index >= 0);
    assert.equal(hp.output[index], hp.output[index - 1]);
  });
  it('attaque même lorsque le joueur esquive', () => {
    for (const beat of timeline.beats) {
      if ((beat.kind === 'attack' || beat.kind === 'dodge') && beat.attacker === 'ENEMY') {
        assert.equal(enemyMotionAt(timeline.beats, contactAt(beat)).pose, 'attack');
      }
    }
  });
  it('esquive sans réaction de blessure', () => {
    const beat = { kind: 'dodge', at: 100, until: 1000, index: 0, attacker: 'PLAYER', dodger: 'ENEMY' } as const;
    const motion = enemyMotionAt([beat], contactAt(beat));
    assert.equal(motion.pose, 'idle');
    assert.notEqual(motion.x, 0);
    assert.equal(motion.flash, 0);
  });
  it('arrête les transformations avec réduction des animations et après le verdict', () => {
    const beat = timeline.beats.find((b) => b.kind === 'attack')!;
    const reduced = enemyMotionAt(timeline.beats, contactAt(beat), true);
    assert.equal(reduced.x, 0);
    assert.equal(reduced.y, 0);
    assert.equal(reduced.scale, 1);
    assert.equal(reduced.rotate, 0);
    assert.equal(reduced.flash, 0);
    assert.deepEqual(enemyMotionAt(timeline.beats, timeline.duration), { pose: 'idle', x: 0, y: 0, scale: 1, rotate: 0, flash: 0 });
  });
  it('préserve les résultats et les durées des combats actuels', () => {
    for (const battle of fixtures) {
      const original = buildBattleTimeline(battle);
      const illustrated = buildBattleTimeline(battle, { illustrated: true });
      assert.deepEqual(illustrated.tally, original.tally);
      assert.deepEqual(illustrated.beats, original.beats);
      assert.equal(illustrated.duration, original.duration);
      for (const side of ['player', 'enemy'] as const) {
        assert.equal(illustrated[side].hp.output.at(-1), original[side].hp.output.at(-1));
      }
    }
  });
});
