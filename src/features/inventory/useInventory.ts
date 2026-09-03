import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { Failure } from '@/features/auth/problems';
import { INVENTORY_QUERY_KEY } from './inventoryCache.ts';
import type { Inventory } from './inventory.ts';

export { INVENTORY_QUERY_KEY } from './inventoryCache.ts';

async function fetchInventory(): Promise<Inventory> {
  return queryOrFailure(() => api.GET('/api/inventory'));
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
  return useQuery({
    queryKey: INVENTORY_QUERY_KEY,
    queryFn: fetchInventory,
  });
}
