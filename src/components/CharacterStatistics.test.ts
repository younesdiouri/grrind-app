import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { CharacterStatistics } from '@/components/CharacterStatistics';
import { ItemCard } from '@/components/ItemCard';
import { EquipmentBoard } from '@/components/EquipmentBoard';

test('la fiche montre chaque total serveur, sa ventilation et les onze statistiques de combat', () => {
  const markup = renderToStaticMarkup(createElement(CharacterStatistics, { statistics: {
    attributes: {
      strength: { base: 120, equipmentBonus: 15, effective: 149 },
      endurance: { base: 0, equipmentBonus: 0, effective: 0 },
      mobility: { base: 1, equipmentBonus: 2, effective: 3 },
      dexterity: { base: 5, equipmentBonus: 4, effective: 9 },
      vitality: { base: 10, equipmentBonus: 3, effective: 13 },
    },
    fighter: { hp: 140, damage: 16, mitigationPercent: 8, comboPercent: 0, dodgePercent: 7,
      maintenancePercent: 0, criticalChancePercent: 0, guardPercent: 0,
      criticalResistancePercent: 0, cooldownReductionPercent: 0, precisionPercent: 0 },
  } }));
  assert.match(markup, /Force, 149, 120 de base · \+15 équipement/);
  assert.match(markup, /Armure, 8 %/);
  assert.match(markup, /Esquive, 7 %/);
  assert.equal((markup.match(/data-testid="attribute-/g) ?? []).length, 5);
  assert.equal((markup.match(/data-testid="stat-/g) ?? []).length, 11);
  assert.equal((markup.match(/<svg/g) ?? []).length, 16);
});

test('un objet public ne montre aucun prix et les emplacements publics ne proposent aucun geste', () => {
  const markup = renderToStaticMarkup(createElement(ItemCard, { item: {
    key: 'BOOTS', kind: 'EQUIPMENT', name: 'Bottes', rarity: 'COMMON', slot: 'FEET',
    modifiers: [], imageUrl: '', quantity: 1,
  }, equipped: true }));
  assert.match(markup, /Bottes/);
  assert.match(markup, /ÉQUIPÉ/);
  assert.doesNotMatch(markup, /Valeur|Vendre|Retirer|Équiper/);
  const board = renderToStaticMarkup(createElement(EquipmentBoard, { equipment: {
    HEAD: null, CHEST: null, HANDS: null, LEGS: null, FEET: null, ACCESSORY: null, WEAPON: null,
  } }));
  assert.doesNotMatch(board, /role="button"|Afficher les objets compatibles/);
  assert.match(board, /Tête, vide/);
});
