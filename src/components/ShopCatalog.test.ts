import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ShopCatalog, ShopItemDetails, ShopPurchaseReceipt } from '@/components/ShopCatalog';
import type { components } from '@/api/schema';

const item: components['schemas']['ShopListing'] = {
  key: 'FER_PLAY', name: 'Le Fer Play', kind: 'EQUIPMENT', slot: 'WEAPON', rarity: 'RARE',
  weaponType: null, modifiers: [{ type: 'DAMAGE_BONUS', value: 7, discipline: null }],
  priceCoins: 321, imageUrl: '', affordable: true, owned: false, unlocked: true, minimumLevel: 5,
};

test('la boutique rend les vrais prix et permet d’inspecter aussi les objets verrouillés', () => {
  const markup = renderToStaticMarkup(createElement(ShopCatalog, {
    items: [item, { ...item, key: 'LOCKED', name: 'Plus tard', unlocked: false, minimumLevel: 12 }],
    category: 'all', onCategory() {}, onSelect() {},
  }));
  assert.match(markup, /Le Fer Play, Rare, 321 pièces/);
  assert.match(markup, /Plus tard, Rare, 321 pièces, Niveau 12/);
  assert.match(markup, /shop-item-LOCKED/);
  assert.doesNotMatch(markup, /aria-disabled="true"/);
  assert.doesNotMatch(markup, />Rare</);
});

test('les filtres conservent les coffres déjà possédés et toutes les données du catalogue', () => {
  const chest = { ...item, key: 'CHEST', name: 'Coffre', kind: 'CHEST' as const, slot: null, owned: true };
  const markup = renderToStaticMarkup(createElement(ShopCatalog, {
    items: [item, chest], category: 'chests', onCategory() {}, onSelect() {},
  }));
  assert.match(markup, /shop-item-CHEST/);
  assert.doesNotMatch(markup, /shop-item-FER_PLAY|Déjà possédé/);
  assert.match(markup, /aria-selected="true"/);
});

test('la fiche conserve tous les effets et bloque l’achat selon les drapeaux serveur', () => {
  const markup = renderToStaticMarkup(createElement(ShopItemDetails, {
    item: { ...item, affordable: false }, busy: false, onBuy() {},
  }));
  assert.match(markup, /Dégâts \+7/);
  assert.match(markup, /321 pièces/);
  assert.match(markup, /Pas assez de pièces/);
  assert.match(markup, /aria-disabled="true"/);
  const owned = renderToStaticMarkup(createElement(ShopItemDetails, {
    item: { ...item, owned: true }, busy: false, onBuy() {},
  }));
  assert.match(owned, /Déjà possédé/);
  assert.doesNotMatch(owned, /Acheter —/);
});

test('une catégorie vide reste compréhensible et une boutique vide n’invente aucun produit', () => {
  const markup = renderToStaticMarkup(createElement(ShopCatalog, {
    items: [], category: 'all', onCategory() {}, onSelect() {},
  }));
  assert.match(markup, /L’étal est vide/);
  assert.doesNotMatch(markup, /shop-item-/);
});

test('le reçu montre la dépense et l’objet réellement rendus par le serveur', () => {
  const markup = renderToStaticMarkup(createElement(ShopPurchaseReceipt, {
    purchase: { item: { ...item, name: 'Objet confirmé' }, spentCoins: 299, coinsBefore: 500, coinsAfter: 201 },
    onContinue() {},
  }));
  assert.match(markup, /Objet confirmé/);
  assert.match(markup, /299 pièces/);
  assert.doesNotMatch(markup, /321 pièces/);
  assert.match(markup, /Dans ton sac/);
});
