import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { Failure } from '@/features/auth/problems';

export type Shop = Awaited<ReturnType<typeof fetchShop>>;
export const SHOP_QUERY_KEY = ['shop'] as const;

async function fetchShop() {
  return queryOrFailure(() => api.GET('/api/shop'));
}

/** L'étal et son solde : le serveur sert les deux dans la même réponse. */
export function useShop(): UseQueryResult<Shop, Failure> {
  return useQuery({ queryKey: SHOP_QUERY_KEY, queryFn: fetchShop });
}
