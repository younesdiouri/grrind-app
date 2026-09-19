import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import { alamMotion } from '@/design/tokens';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { shopActionKeys } from '@/features/shop/actionKeyStore';
import { createConfirmedAction } from './confirmedAction';

export type AlamRun = components['schemas']['AlamRun'];
export const ALAM_KEY = ['alam'] as const;
const launch = createConfirmedAction(shopActionKeys, (_intention, key) =>
  api.POST('/api/guild/alam/runs', { params: { header: { 'Idempotency-Key': key } } }));

export function launchAlam(playerId: string, guildId: string) { return launch(`alam:${playerId}:${guildId}`); }

export function useAlamCurrent(guildId: string | undefined) {
  const focused = useIsFocused();
  return useQuery<components['schemas']['AlamCurrent'], Failure>({
    queryKey: [...ALAM_KEY, 'current', guildId], enabled: !!guildId && focused,
    queryFn: () => queryOrFailure(() => api.GET('/api/guild/alam')),
    refetchInterval: (query) => focused && !query.state.error
      ? Math.min(alamMotion.pollMaxMs, Math.max(1000, (query.state.data?.pollAfterSeconds ?? 5) * 1000)) : false,
    refetchIntervalInBackground: false,
  });
}

export function useAlamHistory(guildId: string | undefined) {
  const focused = useIsFocused();
  return useInfiniteQuery({
    queryKey: [...ALAM_KEY, 'history', guildId], enabled: !!guildId && focused,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => queryOrFailure(() => api.GET('/api/guild/alam/runs', { params: { query: { cursor: pageParam, limit: 20 } } })),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

/** Une lecture de replay ne lance jamais une mutation, même après une reconnexion. */
export function useAlamRun(id: string) {
  const auth = useAuth();
  const focused = useIsFocused();
  return useQuery<AlamRun, Failure>({
    queryKey: [...ALAM_KEY, 'run', auth.status === 'signedIn' ? auth.user.id : null, id],
    queryFn: () => queryOrFailure(() => api.GET('/api/guild/alam/runs/{id}', { params: { path: { id } } })),
    enabled: !!id && focused,
    refetchInterval: (query) => focused && !query.state.error && query.state.data?.status === 'COLLECTING' ? 5000 : false,
    refetchIntervalInBackground: false,
  });
}
