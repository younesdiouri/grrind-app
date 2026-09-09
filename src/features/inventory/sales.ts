import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { api } from '@/api/client';
import { createSaleAction, type PendingSale } from './saleRunner.ts';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'app.grrind.sales',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const actions = new Map<string, ReturnType<typeof createSaleAction>>();

/** L’intention appartient au compte : changer de session ne doit jamais vendre pour lui. */
export function salesFor(userId: string) {
  const existing = actions.get(userId);
  if (existing !== undefined) return existing;

  const recordKey = `grrind.sale.${userId}`;
  const action = createSaleAction({
    store: {
      read: async () => {
        const raw = await SecureStore.getItemAsync(recordKey, OPTIONS);
        if (raw === null) return null;
        const value = JSON.parse(raw) as Partial<PendingSale>;
        if (typeof value.key !== 'string' || typeof value.body?.itemKey !== 'string'
          || !Number.isSafeInteger(value.body.expectedSellPriceCoins)
          || value.body.expectedSellPriceCoins < 0) {
          // Une intention illisible ne prouve pas l’absence de vente : ne pas la remplacer.
          throw new Error('Intention de vente illisible');
        }
        return value as PendingSale;
      },
      write: (pending) => pending === null
        ? SecureStore.deleteItemAsync(recordKey, OPTIONS)
        : SecureStore.setItemAsync(recordKey, JSON.stringify(pending), OPTIONS),
      mint: () => Crypto.randomUUID(),
    },
    request: ({ body, params }) => api.POST('/api/inventory/sales', { body, params }),
  });
  actions.set(userId, action);
  return action;
}
