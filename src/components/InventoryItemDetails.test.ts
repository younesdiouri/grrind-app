import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { InventoryItemDetails } from '@/components/InventoryItemDetails';
import type { InventoryLine } from '@/features/inventory/inventory';

const shirt: InventoryLine = {
  key: 'SPORT_TSHIRT_CORAL', name: 'T-shirt sportif — Corail', kind: 'EQUIPMENT', slot: 'CHEST',
  rarity: 'RARE', weaponType: null, modifiers: [], priceCoins: 99, sellPriceCoins: 17,
  imageUrl: '', quantity: 1,
};
const actions = { onEquip: () => {}, onUnequip: () => {}, onSell: () => {}, onOpenChest: () => {}, onCraft: () => {} };
function markup(item: InventoryLine, equipped = false, blocked = false) {
  return renderToStaticMarkup(createElement(InventoryItemDetails, { item, equipped, blocked, busy: false, ...actions }));
}

test('la fiche propose équiper et vendre au prix serveur puis retirer pour l’objet porté', () => {
  assert.match(markup(shirt), /Équiper — T-shirt sportif — Corail/);
  assert.match(markup(shirt), /Vendre · 17 pièces/);
  assert.doesNotMatch(markup(shirt), />RARE</);
  const worn = markup(shirt, true);
  assert.match(worn, /Retirer — T-shirt sportif — Corail/);
  assert.doesNotMatch(worn, /Vendre ·/);
  assert.match(worn, /Retire cet objet avant de vendre son dernier exemplaire/);
  assert.match(markup({ ...shirt, quantity: 2 }, true), /Vendre · 17 pièces/);
});

test('la fiche réserve l’atelier aux composants et l’ouverture aux coffres', () => {
  const resource = markup({ ...shirt, kind: 'RESOURCE', slot: null, quantity: 142 });
  assert.match(resource, /Voir les recettes à l’atelier/);
  assert.match(resource, /×142/);
  assert.doesNotMatch(resource, /Équiper —|Retirer —|Vendre ·|Ouvrir —/);
  const chest = markup({ ...shirt, name: 'Coffre', kind: 'CHEST', slot: null });
  assert.match(chest, /Ouvrir — Coffre/);
  assert.doesNotMatch(chest, /Équiper —|Vendre ·|Voir les recettes/);
});

test('une mutation ou une vente incertaine bloque les actions de la fiche', () => {
  const held = markup(shirt, false, true);
  assert.match(held, /aria-disabled="true"/);
  assert.doesNotMatch(held, /aria-disabled="false"/);
});
