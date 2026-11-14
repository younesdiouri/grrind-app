import { queryOptions, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { queryForOwner } from '@/api/privateQueries';
import { useAuth } from '@/features/auth/useAuth';
import { myGuildQueryKey } from './useMyGuild.ts';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

export type Risalat = components['schemas']['Risalat'];

/**
 * Le bloc suit le compte, comme `myGuildQueryKey`. Il rejoint l'invalidation après un ralliement et
 * un départ (`guilde.tsx`) : rejoindre une guilde doit faire apparaître ses Risālāt sans
 * qu'on quitte l'onglet.
 */
export const risalatQueryKey = (userId: string | null) => [...myGuildQueryKey(userId), 'risalat'] as const;

export function risalatOptions(userId: string | null) {
  return queryOptions<Risalat, Failure>({
    queryKey: risalatQueryKey(userId), enabled: userId !== null,
    queryFn: ({ signal }) => queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/guilds/mine/risalat', { signal }))),
  });
}

/**
 * `GET /api/guilds/mine/risalat` — le bloc entier, en tête de l'onglet Guilde.
 *
 * Contrairement à `GET /api/guilds/mine`, cette route **n'existe qu'à l'intérieur d'une
 * guilde** : un joueur sans guilde y reçoit `guild-not-found` en 404, pas un `null` à 200.
 * Ce hook n'a donc rien pour distinguer ce cas d'un refus ordinaire — et il n'a pas à le
 * faire : il n'est monté que depuis `Roster`, jamais depuis `EmptyState` ni `gate`, ce qui
 * suffit à ce que l'appel ne parte tout simplement pas pour un joueur qui n'en a pas.
 */
export function useRisalat(): UseQueryResult<Risalat, Failure> {
  const auth = useAuth();
  return useQuery(risalatOptions(auth.status === 'signedIn' ? auth.user.id : null));
}
