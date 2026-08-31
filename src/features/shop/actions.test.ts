import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createActionKeys } from './actionKeys.ts';
import { createShopActions } from './actionRunner.ts';

function keys() {
  let disk: Record<string, string> = {};
  let minted = 0;

  return createActionKeys({
    read: async () => disk,
    write: async (next) => {
      disk = next;
    },
    mint: () => `clé-${++minted}`,
  });
}

describe('les POST boutique idempotents', () => {
  it('transmet la même Idempotency-Key aux retries d’un achat', async () => {
    const sent: string[] = [];
    const actions = createShopActions({
      keys: keys(),
      requests: {
        purchase: async (request) => {
          sent.push(request.params.header['Idempotency-Key']);
          throw new Error('réseau coupé');
        },
        openChest: async () => {
          throw new Error('hors périmètre');
        },
      },
    });

    await actions.purchaseItem('WORN_RUNNING_SHOES');
    await actions.purchaseItem('WORN_RUNNING_SHOES');

    assert.deepEqual(sent, ['clé-1', 'clé-1']);
  });

  it('transmet la même Idempotency-Key aux retries d’une ouverture', async () => {
    const sent: string[] = [];
    const actions = createShopActions({
      keys: keys(),
      requests: {
        purchase: async () => {
          throw new Error('hors périmètre');
        },
        openChest: async (request) => {
          sent.push(request.params.header['Idempotency-Key']);
          throw new Error('réseau coupé');
        },
      },
    });

    await actions.openChest('DUNE_CHEST');
    await actions.openChest('DUNE_CHEST');

    assert.deepEqual(sent, ['clé-1', 'clé-1']);
  });
});
