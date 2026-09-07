import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { entranceMotionAt } from './entranceMotion.ts';

describe('arrivée d’Al-Kasal', () => {
  it('arrive depuis le bas et devient visible avant de parler', () => {
    const start = entranceMotionAt('entering', -1, false);
    const end = entranceMotionAt('entering', 0, false);
    assert.equal(start.opacity, 0);
    assert.equal(start.dialogueOpacity, 0);
    assert.ok(start.y > end.y);
    assert.ok(start.scale < end.scale);
    assert.equal(end.opacity, 1);
    assert.equal(end.dialogueOpacity, 1);
  });
  it('respire pendant le dialogue sans quitter sa place', () => {
    const first = entranceMotionAt('dialogue', 0.25, false);
    const next = entranceMotionAt('dialogue', 0.75, false);
    assert.notEqual(first.y, next.y);
    assert.equal(first.top, next.top);
    assert.equal(first.opacity, 1);
    assert.equal(first.dialogueOpacity, 1);
  });
  it('rejoint la position de combat sans saut au toucher', () => {
    const dialogue = entranceMotionAt('dialogue', 0, false);
    const start = entranceMotionAt('combat', 0, false);
    const end = entranceMotionAt('combat', 700, false);
    assert.equal(dialogue.top, start.top);
    assert.equal(dialogue.bottom, start.bottom);
    assert.equal(end.top, 0);
    assert.equal(end.bottom, 24);
    assert.equal(end.dialogueOpacity, 0);
  });
  it('reste visible et immobile quand les animations sont réduites', () => {
    for (const time of [-1, -0.5, 0, 0.25, 0.75]) {
      const state = entranceMotionAt(time < 0 ? 'entering' : 'dialogue', time, true);
      assert.equal(state.opacity, 1);
      assert.equal(state.y, 0);
      assert.equal(state.scale, 1);
    }
  });
});
