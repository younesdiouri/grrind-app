import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, type Failure } from '@/features/auth/problems';

export type GuildDetail = components['schemas']['GuildDetail'];

/** La clé unique de la requête d'ouverture de l'onglet — aucun paramètre, comme la route. */
export const MY_GUILD_QUERY_KEY = ['guilds', 'mine'] as const;

async function fetchMyGuild(): Promise<GuildDetail | null> {
  const { data, error } = await api.GET('/api/guilds/mine');

  if (data === undefined) {
    // `useQuery` distingue un état `error` d'un état `success` sur ce qui est *jeté*, pas sur
    // ce qui est rendu : une `Failure` structurée voyage donc en exception, exactement comme
    // le reste du client la fait remonter par `failureFrom`.
    throw failureFrom(error);
  }

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
