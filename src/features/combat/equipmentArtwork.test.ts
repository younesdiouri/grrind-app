import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { equipmentPlacement } from './equipmentArtwork.ts';

describe('le point d’attache du calque d’équipement', () => {
  const anchors = { idle: { x: 0.6, y: 0.3, span: 0.1, rotate: 20 } };
  const item = { aspectRatio: 2, scale: 1, pivot: { x: 0.25, y: 0.5 } };
  it('place le pivot de l’objet sur la tête et garde la rotation locale', () => {
    const box = equipmentPlacement(anchors, 'idle', item, false)!;
    assert.ok(Math.abs(box.left + box.width * box.pivotX - 0.6) < 1e-12);
    assert.equal(box.top + box.height * box.pivotY, 0.3);
    assert.equal(box.rotate, 20);
  });
  it('inverse aussi le pivot quand une vue symétrique réutilise la même texture', () => {
    const box = equipmentPlacement(anchors, 'idle', item, true)!;
    assert.equal(box.pivotX, 0.75);
    assert.ok(Math.abs(box.left + box.width * box.pivotX - 0.6) < 1e-12);
    assert.equal(box.width / box.height, item.aspectRatio);
  });
  it('cache l’objet si le personnage ou la stance ne possède pas cet ancrage', () => {
    assert.equal(equipmentPlacement(undefined, 'idle', item, false), null);
    assert.equal(equipmentPlacement(anchors, 'dodge', item, false), null);
  });
});
