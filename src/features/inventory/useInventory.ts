import { queryOptions, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { queryForOwner } from '@/api/privateQueries';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { inventoryQueryKey } from './inventoryCache.ts';
import type { Inventory } from './inventory.ts';

export { inventoryQueryKey } from './inventoryCache.ts';

async function fetchInventory(userId: string | null, signal: AbortSignal): Promise<Inventory> {
  return queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/inventory', { signal })));
}

export function inventoryOptions(userId: string | null) {
  return queryOptions<Inventory, Failure>({
    queryKey: inventoryQueryKey(userId),
    queryFn: ({ signal }) => fetchInventory(userId, signal),
    enabled: userId !== null,
  });
}

/**
 * `GET /api/inventory` — le sac, la doublure et la bourse en **un seul aller-retour**.
 *
 * Le cache est partagé entre l'accueil, qui n'en lit que le solde et le compte, et l'écran du
 * sac, qui lit tout : ouvrir le sac depuis l'accueil n'attend donc rien. C'est la raison pour
 * laquelle ce hook passe par React Query plutôt que par le `useState`/`useEffect` des hooks de
 * combat — deux écrans veulent la même donnée, et le second ne doit pas la redemander.
 *
 * C'est aussi ce qui rend les mutations propres : `PUT`/`DELETE` rendent l'inventaire entier,
 * qui **remplace** l'entrée du cache (`setQueryData`) au lieu d'être rapiécé — voir
 * `equipmentActions.ts`.
 */
export function useInventory(): UseQueryResult<Inventory, Failure> {
  const focused = useIsFocused();
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  return useQuery({
    ...inventoryOptions(userId),
    enabled: focused && userId !== null,
  });
}
