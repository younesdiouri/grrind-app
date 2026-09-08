import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PendingSale } from './saleRunner.ts';
import { createSaleAction } from './saleRunner.ts';

function store() {
  let disk: PendingSale | null = null;
  let minted = 0;
  return {
    read: async () => disk,
    write: async (next: PendingSale | null) => { disk = next; },
    mint: () => `sale-${++minted}`,
  };
}

describe('vente d’un exemplaire', () => {
  it('conserve la même clé et le prix confirmé après une coupure réseau', async () => {
    const sent: unknown[] = [];
    const sell = createSaleAction({
      store: store(),
      request: async (request) => {
        sent.push(request);
        throw new Error('réseau coupé après écriture');
      },
    });
    await sell.sell({ itemKey: 'WORN_RUNNING_SHOES', expectedSellPriceCoins: 50 });
    await sell.sell({ itemKey: 'WORN_RUNNING_SHOES', expectedSellPriceCoins: 50 });
    assert.equal(sent.length, 2);
    assert.deepEqual(sent[0], sent[1]);
  });

  it('rend le gain et le solde serveur, même pour un prix nul', async () => {
    const sale = { itemKey: 'WORN_RUNNING_SHOES', quantity: 1, coins: 0, coinsBefore: 123, coinsAfter: 123 };
    const sell = createSaleAction({ store: store(), request: async () => ({ data: sale }) });
    assert.deepEqual(await sell.sell({ itemKey: sale.itemKey, expectedSellPriceCoins: 0 }), { kind: 'sold', sale });
  });

  it('crée une nouvelle clé pour l’exemplaire suivant après un succès', async () => {
    const sent: string[] = [];
    const sell = createSaleAction({
      store: store(),
      request: async ({ params }) => {
        sent.push(params.header['Idempotency-Key']);
        return { data: { itemKey: 'SHOES', quantity: 1, coins: 50, coinsBefore: 100, coinsAfter: 150 } };
      },
    });
    await sell.sell({ itemKey: 'SHOES', expectedSellPriceCoins: 50 });
    await sell.sell({ itemKey: 'SHOES', expectedSellPriceCoins: 50 });
    assert.deepEqual(sent, ['sale-1', 'sale-2']);
  });

  it('ne rejoue pas automatiquement au nouveau prix après un refus', async () => {
    const sent: unknown[] = [];
    const sell = createSaleAction({
      store: store(),
      request: async (request) => {
        sent.push(request);
        return { error: { type: 'https://grrind.app/problems/sale-price-changed', title: 'Changed', detail: 'Prix changé', status: 422 } };
      },
    });
    const outcome = await sell.sell({ itemKey: 'SHOES', expectedSellPriceCoins: 50 });
    assert.equal(outcome.kind, 'refused');
    assert.equal(sent.length, 1);
  });
  it('reprend le corps et la clé persistés après redémarrage malgré un nouveau prix', async () => {
    const disk = store();
    const first = createSaleAction({ store: disk, request: async () => { throw new Error('réseau'); } });
    await first.sell({ itemKey: 'SHOES', expectedSellPriceCoins: 50 });
    const held = await disk.read();
    const sent: unknown[] = [];
    const restarted = createSaleAction({ store: disk, request: async (request) => {
      sent.push(request);
      throw new Error('réseau');
    } });
    await restarted.sell({ itemKey: 'SHOES', expectedSellPriceCoins: 80 });
    assert.deepEqual(sent, [{ body: held?.body, params: { header: { 'Idempotency-Key': held?.key } } }]);
  });

  it('réunit deux confirmations simultanées dans un seul POST', async () => {
    let calls = 0;
    const action = createSaleAction({ store: store(), request: async () => {
      calls++;
      throw new Error('réseau');
    } });
    await Promise.all([
      action.sell({ itemKey: 'SHOES', expectedSellPriceCoins: 50 }),
      action.sell({ itemKey: 'SHOES', expectedSellPriceCoins: 50 }),
    ]);
    assert.equal(calls, 1);
  });

  it('libère une intention refusée pour confirmer ensuite le nouveau prix', async () => {
    const disk = store();
    const action = createSaleAction({ store: disk, request: async () => ({ error: {
      type: 'https://grrind.app/problems/sale-price-changed', detail: 'Prix changé', status: 422,
    } }) });
    await action.sell({ itemKey: 'SHOES', expectedSellPriceCoins: 50 });
    assert.equal(await disk.read(), null);
  });

});
