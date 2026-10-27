import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Text } from 'react-native';

import { CharacterInventory, CharacterTabs } from '@/components/CharacterInventory';
import type { components } from '@/api/schema';

const statistics: components['schemas']['PlayerStatistics'] = {
  attributes: {
    strength: { base: 0, equipmentBonus: 0, effective: 0 },
    endurance: { base: 0, equipmentBonus: 0, effective: 0 },
    mobility: { base: 0, equipmentBonus: 0, effective: 0 },
    dexterity: { base: 0, equipmentBonus: 0, effective: 0 },
    vitality: { base: 0, equipmentBonus: 0, effective: 0 },
  },
  fighter: { hp: 140, damage: 16, mitigationPercent: 0, comboPercent: 0, dodgePercent: 0,
    maintenancePercent: 0, criticalChancePercent: 0, guardPercent: 0,
    criticalResistancePercent: 0, cooldownReductionPercent: 0, precisionPercent: 0 },
};
const inventory: components['schemas']['PublicInventory'] = {
  equipment: { HEAD: null, CHEST: null, LEGS: null, FEET: null, WEAPON: null, ACCESSORY: null },
  items: [],
};

test('l’inventaire ouvre l’équipement et range Apparence, Sac et Statistiques dans cet ordre', () => {
  const markup = renderToStaticMarkup(createElement(CharacterInventory, {
    inventory, statistics, onAppearance() {}, equipment: createElement(Text, null, 'APERÇU ÉQUIPÉ'), bag: createElement(Text, null, 'CONTENU DU SAC'),
  }));
  assert.match(markup, /APERÇU ÉQUIPÉ/);
  assert.doesNotMatch(markup, /CONTENU DU SAC/);
  const tabs = ['equipment', 'appearance', 'bag', 'statistics'].map((key) => markup.indexOf(`data-testid="character-tab-${key}"`));
  assert.ok(tabs.every((position, index) => position >= 0 && (index === 0 || position > tabs[index - 1])));
});

test('la fiche publique ne propose pas de modifier l’apparence', () => {
  const markup = renderToStaticMarkup(createElement(CharacterInventory, { inventory, statistics, equipment: createElement(Text, null, 'APERÇU PUBLIC') }));
  assert.match(markup, /APERÇU PUBLIC/);
  assert.doesNotMatch(markup, /character-tab-appearance/);
});

test('le raccourci Sac ouvre réellement le sac au lieu de l’équipement', () => {
  const markup = renderToStaticMarkup(createElement(CharacterInventory, {
    inventory, statistics, section: 'bag', onSectionChange() {},
    equipment: createElement(Text, null, 'APERÇU ÉQUIPÉ'), bag: createElement(Text, null, 'CONTENU DU SAC'),
  }));
  assert.match(markup, /CONTENU DU SAC/);
  assert.doesNotMatch(markup, /APERÇU ÉQUIPÉ/);
  assert.match(markup, /aria-selected="true"[^>]*data-testid="character-tab-bag"/);
});

test('les quatre onglets restent accessibles lorsque l’apparence est ouverte', () => {
  const markup = renderToStaticMarkup(createElement(CharacterTabs, { section: 'appearance', appearanceEnabled: true, onSelect() {} }));
  for (const key of ['equipment', 'appearance', 'bag', 'statistics']) assert.match(markup, new RegExp(`character-tab-${key}`));
  assert.match(markup, /aria-selected="true"[^>]*data-testid="character-tab-appearance"/);
});
