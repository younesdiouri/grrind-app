import { api } from '@/api/client';

import { shopActionKeys } from './actionKeyStore.ts';
import {
  createShopActions,
  type ChestOpenOutcome,
  type PurchaseOutcome,
} from './actionRunner.ts';

export type { ChestOpenOutcome, PurchaseOutcome };

const actions = createShopActions({
  keys: shopActionKeys,
  requests: {
    purchase: ({ itemKey, params }) => api.POST('/api/shop/purchases', { params, body: { itemKey } }),
    openChest: ({ params }) => api.POST('/api/inventory/chests/{key}/open', { params }),
  },
});

export const { purchaseItem, openChest } = actions;
