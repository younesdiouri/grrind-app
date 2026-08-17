import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

export type GuildDetail = components['schemas']['GuildDetail'];

/** La clé unique de la requête d'ouverture de l'onglet — aucun paramètre, comme la route. */
export const MY_GUILD_QUERY_KEY = ['guilds', 'mine'] as const;

async function fetchMyGuild(): Promise<GuildDetail | null> {
  // `queryOrFailure` couvre les deux façons dont cet appel peut ne pas rendre de guilde : un
  // problème nommé par le serveur (ressorti par `data === undefined`), et un réseau qui ne
  // répond pas du tout (l'exception qu'`openapi-fetch` relance faute de middleware pour
  // l'absorber). Sans ce second cas, `messageFor` recevrait autre chose qu'une `Failure` et
  // jetterait à son tour — c'est le trou que ce module ferme.
  const data = await queryOrFailure(() => api.GET('/api/guilds/mine'));

  // `{ "guild": null }` avec un 200 est un état normal, pas une erreur : il ressort tel quel,
  // sans jamais passer par la branche `error`.
  return data.guild;
}

/**
 * `GET /api/guilds/mine`, à l'ouverture de l'onglet. **Aucun paramètre** : c'est la requête
 * d'ouverture, elle ne demande rien de plus que d'être authentifié.
 */
export function useMyGuild(): UseQueryResult<GuildDetail | null, Failure> {
  return useQuery({
    queryKey: MY_GUILD_QUERY_KEY,
    queryFn: fetchMyGuild,
  });
}
