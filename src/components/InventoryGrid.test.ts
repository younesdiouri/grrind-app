import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { InventoryBag, InventoryGrid } from '@/components/InventoryGrid';
import type { Inventory, InventoryLine } from '@/features/inventory/inventory';

const shirt: InventoryLine = {
  key: 'SPORT_TSHIRT_CORAL', name: 'T-shirt sportif — Corail', kind: 'EQUIPMENT', slot: 'CHEST',
  rarity: 'RARE', weaponType: null, modifiers: [], priceCoins: 99, sellPriceCoins: 17,
  imageUrl: '', quantity: 3,
};
const equipment: Inventory['equipment'] = {
  HEAD: null, CHEST: shirt, LEGS: null, FEET: null, WEAPON: null, ACCESSORY: null,
};

test('la grille annonce l’objet, la rareté, la quantité et l’état équipé au lecteur d’écran', () => {
  const markup = renderToStaticMarkup(createElement(InventoryGrid, {
    items: [shirt], equipment, onSelect: () => {}, selectedKey: shirt.key,
  }));
  assert.match(markup, /role="button"/);
  assert.match(markup, /aria-label="T-shirt sportif — Corail, Rare, 3 exemplaires, équipé"/);
  assert.match(markup, /aria-selected="true"/);
  // RN Web ne rend pas accessibilityHint ; vérifier aussi la prop du composant natif réel.
  const tile = InventoryGrid({ items: [shirt], equipment, onSelect: () => {} }).props.children[0].props.children[0];
  assert.equal(tile.props.accessibilityHint, 'Ouvrir la fiche de l’objet');
  assert.match(markup, /×3/);
  assert.doesNotMatch(markup, />Rare</);
});

test('un composant garde sa quantité serveur et ne propose pas de s’équiper depuis la case', () => {
  const markup = renderToStaticMarkup(createElement(InventoryGrid, {
    items: [{ ...shirt, key: 'FIBER', name: 'Fibre', kind: 'RESOURCE', slot: null, quantity: 142 }],
    equipment, onSelect: () => {},
  }));
  assert.match(markup, /Fibre, Rare, 142 exemplaires/);
  assert.match(markup, /×142/);
  assert.doesNotMatch(markup, /, équipé|Équiper —/);
});

test('le sac garde ses catégories et ses objets sans consigne ni libellé visible de rareté', () => {
  const markup = renderToStaticMarkup(createElement(InventoryBag, { items: [shirt], equipment, onSelect() {} }));
  assert.match(markup, /inventory-filter-materials/);
  assert.match(markup, /inventory-item-SPORT_TSHIRT_CORAL/);
  assert.doesNotMatch(markup, /Touche un objet|>Rare</);
});
