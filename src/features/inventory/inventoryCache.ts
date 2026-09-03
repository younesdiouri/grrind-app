import type { QueryClient } from '@tanstack/react-query';

import type { SyncSummary } from '@/features/reward/timeline';
import type { Inventory } from './inventory.ts';

/** La clé unique du sac — aucun paramètre, comme la route. */
export const INVENTORY_QUERY_KEY = ['inventory'] as const;

/**
 * Aligne immédiatement le résumé déjà affiché sur le verdict de la récompense, puis relit
 * l'inventaire entier : le résumé connaît le solde final, mais seul `GET /api/inventory`
 * connaît aussi les éventuels objets tombés pendant la synchronisation.
 */
export function refreshInventoryAfterReward(
  queryClient: QueryClient,
  summary: SyncSummary,
): Promise<void> {
  const last = summary.imported[summary.imported.length - 1];

  if (last !== undefined) {
    queryClient.setQueryData<Inventory>(INVENTORY_QUERY_KEY, (previous) =>
      previous === undefined ? previous : { ...previous, coins: last.coins.after },
    );
  }

  return queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
}
