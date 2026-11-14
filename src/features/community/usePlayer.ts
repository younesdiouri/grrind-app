import { queryOptions, useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { queryForOwner } from '@/api/privateQueries';
import { useAuth } from '@/features/auth/useAuth';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

/** Le détail public enrichi, chargé seulement à l'ouverture du profil. */
export type Player = components['schemas']['PlayerDetail'];

export function playerQueryKey(userId: string | null, id: string) {
  return ['players', userId, id] as const;
}

async function fetchPlayer(userId: string | null, id: string, signal: AbortSignal): Promise<Player> {
  return queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/players/{id}', { params: { path: { id } }, signal })));
}

/**
 * Le profil d'un co-équipier — `GET /api/players/{id}`, en tapant une ligne. `404
 * player-not-found` couvre indistinctement « inconnu » et « hors de la guilde » : l'écran ne
 * cherche pas à distinguer, il affiche le même refus dans les deux cas.
 */
export function usePlayer(id: string): UseQueryResult<Player, Failure> {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  return useQuery(playerOptions(userId, id));
}

export function playerOptions(userId: string | null, id: string) {
  return queryOptions<Player, Failure>({
    queryKey: playerQueryKey(userId, id),
    queryFn: ({ signal }) => fetchPlayer(userId, id, signal),
    enabled: userId !== null,
  });
}
