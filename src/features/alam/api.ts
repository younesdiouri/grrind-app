import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { api } from '@/api/client';
import { queryForOwner } from '@/api/privateQueries';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import { alamMotion } from '@/design/tokens';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { captureSessionGuard } from '@/features/auth/session';
import { shopActionKeys } from '@/features/shop/actionKeyStore';
import { createConfirmedAction } from './confirmedAction';
import { createAlamPreferences } from './preferences';

export type AlamRun = components['schemas']['AlamRun'];
export const alamQueryKey = (userId: string | null) => ['alam', userId] as const;
export const alamPreferences = createAlamPreferences(shopActionKeys, api, captureSessionGuard);
const launch = createConfirmedAction(shopActionKeys, (_intention, key) =>
  api.POST('/api/guild/alam/runs', { params: { header: { 'Idempotency-Key': key } } }), undefined, String, captureSessionGuard);

export function launchAlam(playerId: string, guildId: string) { return launch(`alam:${playerId}:${guildId}`); }

export function useAlamCurrent(guildId: string | undefined) {
  const focused = useIsFocused();
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  return useQuery<components['schemas']['AlamCurrent'], Failure>({
    queryKey: [...alamQueryKey(userId), 'current', guildId], enabled: userId !== null && !!guildId && focused,
    queryFn: ({ signal }) => queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/guild/alam', { signal }))),
    refetchInterval: (query) => focused && !query.state.error
      ? Math.min(alamMotion.pollMaxMs, Math.max(1000, (query.state.data?.pollAfterSeconds ?? 5) * 1000)) : false,
    refetchIntervalInBackground: false,
  });
}

/** Une lecture de replay ne lance jamais une mutation, même après une reconnexion. */
export function useAlamRun(id: string) {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  const focused = useIsFocused();
  return useQuery<AlamRun, Failure>({
    queryKey: [...alamQueryKey(userId), 'run', id],
    queryFn: ({ signal }) => queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/guild/alam/runs/{id}', { params: { path: { id } }, signal }))),
    enabled: userId !== null && !!id && focused,
    refetchInterval: (query) => focused && !query.state.error && query.state.data?.status === 'COLLECTING' ? 5000 : false,
    refetchIntervalInBackground: false,
  });
}
