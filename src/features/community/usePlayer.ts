import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

/** Le détail public enrichi, chargé seulement à l'ouverture du profil. */
export type Player = components['schemas']['PlayerDetail'];

export function playerQueryKey(id: string) {
  return ['players', id] as const;
}

async function fetchPlayer(id: string): Promise<Player> {
  return queryOrFailure(() => api.GET('/api/players/{id}', { params: { path: { id } } }));
}

/**
 * Le profil d'un co-équipier — `GET /api/players/{id}`, en tapant une ligne. `404
 * player-not-found` couvre indistinctement « inconnu » et « hors de la guilde » : l'écran ne
 * cherche pas à distinguer, il affiche le même refus dans les deux cas.
 */
export function usePlayer(id: string): UseQueryResult<Player, Failure> {
  return useQuery({
    queryKey: playerQueryKey(id),
    queryFn: () => fetchPlayer(id),
  });
}
