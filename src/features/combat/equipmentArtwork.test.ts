import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { equipmentFrameScale, equipmentPlacement, type EquipmentArtwork } from './equipmentArtwork.ts';

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

describe('le cadrage du personnage équipé', () => {
  const flipper: EquipmentArtwork = { key: 'fin', attachment: 'foot', source: { uri: '/fin.png' },
    aspectRatio: 2, scale: 1, pivot: { x: 0, y: 0 }, plane: 'front' };
  it('réserve la place de la palme en fente même quand la garde tient dans le cadre', () => {
    const scale = equipmentFrameScale({ foot: {
      idle: { x: 0.5, y: 0.7, span: 0.4, rotate: 0 },
      critical: { x: 0.8, y: 0.7, span: 0.4, rotate: 0 },
    } }, [flipper]);
    assert.ok(scale < 1);
    assert.ok(0.5 + (1.2 - 0.5) * scale <= 1 + Number.EPSILON);
  });
  it('inclut aussi une arme tournée autour de son pivot', () => {
    const scale = equipmentFrameScale({ foot: { attack: { x: 0.5, y: 0.8, span: 0.4, rotate: 90 } } }, [flipper]);
    assert.ok(scale < 1);
    assert.ok(0.5 + (1.2 - 0.5) * scale <= 1 + Number.EPSILON);
  });
  it('garde la taille naturelle sans calque ou sans ancrage compatible', () => {
    assert.equal(equipmentFrameScale(undefined, [flipper]), 1);
    assert.equal(equipmentFrameScale({}, []), 1);
  });
});
