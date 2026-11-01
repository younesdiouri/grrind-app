import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attributeDetail, combatValue } from './statistics.ts';

test('les attributs décrivent la semaine sans promettre de bonus d’équipement', () => {
  assert.equal(attributeDetail({ base: 120, equipmentBonus: 0, effective: 120 }), '120 cette semaine');
  assert.equal(attributeDetail({ base: 0, equipmentBonus: 0, effective: 0 }), '0 cette semaine');
});

test('les valeurs de combat conservent les unités servies', () => {
  assert.equal(combatValue('hp', 180), '180');
  assert.equal(combatValue('damage', 42), '42');
  assert.equal(combatValue('dodgePercent', 17), '17 %');
  assert.equal(combatValue('mitigationPercent', 0), '0 %');
});
