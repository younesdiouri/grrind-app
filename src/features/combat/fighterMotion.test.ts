import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildBattleTimeline, type Battle } from './timeline.ts';
import { fighterMotionAt, contactAt } from './fighterMotion.ts';

const fixtures = ['victoire', 'defaite-boss', 'combat-long'].map((name) => JSON.parse(
  readFileSync(new URL(`../../../fixtures/battle/${name}.json`, import.meta.url), 'utf8'),
) as Battle);
const timeline = buildBattleTimeline(fixtures[1], { illustrated: true });
describe('Combattants : mise en scène', () => {
  it('en duel latéral, les deux camps s’avancent vers le centre et reculent vers leur bord', () => {
    const beat = { kind: 'attack', at: 0, until: 1000, index: 0, attacker: 'PLAYER', damage: 5, mitigated: 0 } as const;
    const at = contactAt(beat);
    assert.ok(fighterMotionAt([beat], 'PLAYER', at, false, true).x > 0);
    assert.ok(fighterMotionAt([beat], 'ENEMY', at, false, true).x > 0);
    assert.equal(fighterMotionAt([beat], 'PLAYER', at, true, true).x, 0);
    const enemyBeat = { ...beat, attacker: 'ENEMY' } as const;
    assert.ok(fighterMotionAt([enemyBeat], 'ENEMY', at, false, true).x < 0);
    assert.ok(fighterMotionAt([enemyBeat], 'PLAYER', at, false, true).x < 0);
  });
  it('réagit au contact, avec vie et haptique synchronisées', () => {
    const beat = timeline.beats.find((b) => b.kind === 'attack' && b.attacker === 'PLAYER')!;
    const contact = contactAt(beat);
    assert.equal(fighterMotionAt(timeline.beats, 'ENEMY', contact - 1).pose, 'idle');
    assert.equal(fighterMotionAt(timeline.beats, 'ENEMY', contact).pose, 'hit');
    assert.ok(timeline.blows.includes(contact));
    const hp = timeline.enemy.hp;
    const index = hp.input.indexOf(contact);
    assert.ok(index >= 0);
    assert.equal(hp.output[index], hp.output[index - 1]);
  });
  it('attaque même lorsque le joueur esquive', () => {
    for (const beat of timeline.beats) {
      if ((beat.kind === 'attack' || beat.kind === 'dodge') && beat.attacker === 'ENEMY') {
        assert.equal(fighterMotionAt(timeline.beats, 'ENEMY', contactAt(beat)).pose, 'attack');
      }
    }
  });
  it('esquive sans réaction de blessure', () => {
    const beat = { kind: 'dodge', at: 100, until: 1000, index: 0, attacker: 'PLAYER', dodger: 'ENEMY' } as const;
    const motion = fighterMotionAt([beat], 'ENEMY', contactAt(beat));
    assert.equal(motion.pose, 'idle');
    assert.notEqual(motion.x, 0);
    assert.equal(motion.flash, 0);
  });
  it('arrête les transformations avec réduction des animations et après le verdict', () => {
    const beat = timeline.beats.find((b) => b.kind === 'attack')!;
    const reduced = fighterMotionAt(timeline.beats, 'ENEMY', contactAt(beat), true);
    assert.equal(reduced.x, 0);
    assert.equal(reduced.y, 0);
    assert.equal(reduced.scale, 1);
    assert.equal(reduced.rotate, 0);
    assert.equal(reduced.flash, 0);
    assert.deepEqual(fighterMotionAt(timeline.beats, 'ENEMY', timeline.duration), { pose: 'idle', x: 0, y: 0, scale: 1, rotate: 0, flash: 0 });
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
  it('le héros joue le geste miroir : attaque sur ses coups, recul vers le bas sur ceux du mob', () => {
    const own = timeline.beats.find((b) => b.kind === 'attack' && b.attacker === 'PLAYER')!;
    const taken = timeline.beats.find((b) => b.kind === 'attack' && b.attacker === 'ENEMY')!;
    const lunge = fighterMotionAt(timeline.beats, 'PLAYER', contactAt(own));
    assert.equal(lunge.pose, 'attack');
    assert.ok(lunge.y < 0, 'le héros s’élance vers le haut, vers le mob');
    const recoil = fighterMotionAt(timeline.beats, 'PLAYER', contactAt(taken));
    assert.equal(recoil.pose, 'hit');
    assert.ok(recoil.y > 0, 'le héros recule vers le bas');
    assert.ok(fighterMotionAt(timeline.beats, 'ENEMY', contactAt(own)).y < 0, 'le mob recule vers le haut');
  });
  it('fige le corps au contact le temps de l’arrêt sur le coup, sans retarder l’éclat', () => {
    const beat = { kind: 'attack', at: 0, until: 1000, index: 0, attacker: 'PLAYER', damage: 5, mitigated: 0 } as const;
    const contact = contactAt(beat);
    const peak = fighterMotionAt([beat], 'ENEMY', contact);
    const held = fighterMotionAt([beat], 'ENEMY', contact + 50);
    assert.equal(held.scale, peak.scale);
    assert.ok(held.flash < peak.flash, 'l’éclat décroît pendant que le corps est figé');
    assert.ok(fighterMotionAt([beat], 'ENEMY', contact + 200).scale > peak.scale, 'puis le corps revient');
  });
});
