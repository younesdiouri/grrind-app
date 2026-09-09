import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attributeDetail, combatValue } from './statistics.ts';

test('les attributs affichent le socle et le bonus sans recomposer la valeur effective', () => {
  assert.equal(attributeDetail({ base: 120, equipmentBonus: 15, effective: 149 }), '120 de base · +15 équipement');
  assert.equal(attributeDetail({ base: 120, equipmentBonus: 0, effective: 120 }), '120 de base · +0 équipement');
  assert.equal(attributeDetail({ base: 120, equipmentBonus: -5, effective: 115 }), '120 de base · -5 équipement');
});

test('les valeurs de combat conservent les unités servies', () => {
  assert.equal(combatValue('hp', 180), '180');
  assert.equal(combatValue('damage', 42), '42');
  assert.equal(combatValue('dodgePercent', 17), '17 %');
  assert.equal(combatValue('mitigationPercent', 0), '0 %');
});
