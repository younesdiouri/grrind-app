import type { QueryClient } from '@tanstack/react-query';
import { isCurrentOwner, type SessionOwner } from '@/features/auth/session';
import { noteEquipmentChanged } from './equipmentRevision.ts';
import type { EquipmentOutcome } from './equipmentActions.ts';

import type { SyncSummary } from '@/features/reward/timeline';
import type { Inventory } from './inventory.ts';

export const inventoryQueryKey = (userId: string | null) => ['inventory', userId] as const;

export function updateInventoryForOwner(client: QueryClient, owner: SessionOwner | null,
  update: Inventory | ((previous: Inventory | undefined) => Inventory | undefined)) {
  if (isCurrentOwner(owner)) client.setQueryData<Inventory>(inventoryQueryKey(owner.id), update);
}

/** Le verdict d'un ancien équipement ne recrée jamais un cache purgé à la sortie. */
export async function mutateInventory(client: QueryClient, owner: SessionOwner | null,
  mutate: () => Promise<EquipmentOutcome>): Promise<EquipmentOutcome | null> {
  if (!isCurrentOwner(owner)) return null;
  const outcome = await mutate();
  if (!isCurrentOwner(owner)) return null;
  if (outcome.ok) {
    updateInventoryForOwner(client, owner, outcome.inventory);
    noteEquipmentChanged();
  }
  return outcome;
}

/**
 * Aligne immédiatement le résumé déjà affiché sur le verdict de la récompense, puis relit
 * l'inventaire entier : le résumé connaît le solde final, mais seul `GET /api/inventory`
 * connaît aussi les éventuels objets tombés pendant la synchronisation.
 */
export function refreshInventoryAfterReward(
  queryClient: QueryClient,
  summary: SyncSummary,
  owner: SessionOwner | null,
): Promise<void> {
  if (!isCurrentOwner(owner)) return Promise.resolve();
  const last = summary.imported[summary.imported.length - 1];

  if (last !== undefined) {
    updateInventoryForOwner(queryClient, owner, (previous) =>
      previous === undefined ? previous : { ...previous, coins: last.coins.after },
    );
  }

  return queryClient.invalidateQueries({ queryKey: inventoryQueryKey(owner.id) });
}
