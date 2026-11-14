import { queryOptions, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { queryForOwner } from '@/api/privateQueries';
import { useAuth } from '@/features/auth/useAuth';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

export type GuildDetail = components['schemas']['GuildDetail'];

export const myGuildQueryKey = (userId: string | null) => ['guilds', userId, 'mine'] as const;

async function fetchMyGuild(userId: string | null, signal: AbortSignal): Promise<GuildDetail | null> {
  // `queryOrFailure` couvre les deux façons dont cet appel peut ne pas rendre de guilde : un
  // problème nommé par le serveur (ressorti par `data === undefined`), et un réseau qui ne
  // répond pas du tout (l'exception qu'`openapi-fetch` relance faute de middleware pour
  // l'absorber). Sans ce second cas, `messageFor` recevrait autre chose qu'une `Failure` et
  // jetterait à son tour — c'est le trou que ce module ferme.
  const data = await queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/guilds/mine', { signal })));

  // `{ "guild": null }` avec un 200 est un état normal, pas une erreur : il ressort tel quel,
  // sans jamais passer par la branche `error`.
  return data.guild;
}

/**
 * `GET /api/guilds/mine`, à l'ouverture de l'onglet. **Aucun paramètre** : c'est la requête
 * d'ouverture, elle ne demande rien de plus que d'être authentifié.
 */
export function myGuildOptions(userId: string | null) {
  return queryOptions<GuildDetail | null, Failure>({
    queryKey: myGuildQueryKey(userId),
    queryFn: ({ signal }) => fetchMyGuild(userId, signal),
    enabled: userId !== null,
  });
}

export function useMyGuild(): UseQueryResult<GuildDetail | null, Failure> {
  const auth = useAuth();
  return useQuery(myGuildOptions(auth.status === 'signedIn' ? auth.user.id : null));
}
