import { api } from '@/api/client';
import { getSessionOwner, isCurrentOwner } from '@/features/auth/session';
import { OFFLINE } from '@/features/auth/problems';

import { shopActionKeys } from './actionKeyStore.ts';
import {
  createShopActions,
  type ChestOpenOutcome,
  type PurchaseOutcome,
} from './actionRunner.ts';

export type { ChestOpenOutcome, PurchaseOutcome };

function actionsForSession() {
  const owner = getSessionOwner();
  if (!isCurrentOwner(owner)) throw OFFLINE;
  return createShopActions({
    keys: {
      keyFor: intention => shopActionKeys.keyFor(`${owner.id}:${intention}`, intention),
      forget: intention => shopActionKeys.forget(`${owner.id}:${intention}`),
    },
    requests: {
      purchase: async ({ itemKey, params }) => {
        if (!isCurrentOwner(owner)) throw OFFLINE;
        return api.POST('/api/shop/purchases', { params, body: { itemKey } });
      },
      openChest: async ({ params }) => {
        if (!isCurrentOwner(owner)) throw OFFLINE;
        return api.POST('/api/inventory/chests/{key}/open', { params });
      },
    },
  });
}

export async function purchaseItem(itemKey: string): Promise<PurchaseOutcome> { return actionsForSession().purchaseItem(itemKey); }
export async function openChest(itemKey: string): Promise<ChestOpenOutcome> { return actionsForSession().openChest(itemKey); }
