import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { components } from '@/api/schema';

import { purchaseControl } from './shopState.ts';

type Listing = components['schemas']['ShopListing'];

function listing(overrides: Partial<Listing> = {}): Listing {
  return {
    key: 'WORN_RUNNING_SHOES',
    kind: 'EQUIPMENT',
    name: 'Baskets usées',
    rarity: 'COMMON',
    slot: 'FEET',
    modifiers: [],
    priceCoins: 30,
    imageUrl: 'https://api.grrind.app/game-images/items/worn-running-shoes.png',
    affordable: true,
    owned: false,
    minimumLevel: 1,
    unlocked: true,
    ...overrides,
  };
}

describe('les contrôles de la boutique', () => {
  it('laisse visible mais rend inerte un objet verrouillé par niveau', () => {
    assert.deepEqual(purchaseControl(listing({ unlocked: false, minimumLevel: 5 })), {
      label: 'Niveau 5',
      disabled: true,
    });
  });

  it('bloque un équipement déjà possédé', () => {
    assert.deepEqual(purchaseControl(listing({ kind: 'EQUIPMENT', owned: true })), {
      label: 'Déjà possédé',
      disabled: true,
    });
  });

  it('laisse acheter un coffre déjà possédé', () => {
    assert.deepEqual(purchaseControl(listing({ kind: 'CHEST', slot: null, owned: true })), {
      label: 'Acheter',
      disabled: false,
    });
  });

  it('bloque un objet que le solde serveur déclare inabordable', () => {
    assert.deepEqual(purchaseControl(listing({ affordable: false })), {
      label: 'Pas assez de pièces',
      disabled: true,
    });
  });
});
