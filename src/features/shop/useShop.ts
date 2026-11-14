import { queryOptions, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { queryForOwner } from '@/api/privateQueries';
import { useAuth } from '@/features/auth/useAuth';
import type { Failure } from '@/features/auth/problems';

export type Shop = Awaited<ReturnType<typeof fetchShop>>;
export const shopQueryKey = (userId: string | null) => ['shop', userId] as const;

async function fetchShop(userId: string | null, signal: AbortSignal) {
  return queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/shop', { signal })));
}

/** L'étal et son solde : le serveur sert les deux dans la même réponse. */
export function shopOptions(userId: string | null) {
  return queryOptions<Shop, Failure>({ queryKey: shopQueryKey(userId), queryFn: ({ signal }) => fetchShop(userId, signal), enabled: userId !== null });
}

export function useShop(): UseQueryResult<Shop, Failure> {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  return useQuery(shopOptions(userId));
}
