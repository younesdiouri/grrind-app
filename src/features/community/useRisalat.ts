import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

export type Risalat = components['schemas']['Risalat'];

/**
 * La clé unique de la requête, sans paramètre, comme la route — même choix que
 * `MY_GUILD_QUERY_KEY`. Elle rejoint l'invalidation qui suit une fondation, un ralliement et
 * un départ (`guilde.tsx`) : rejoindre une guilde doit faire apparaître ses Risālāt sans
 * qu'on quitte l'onglet.
 */
export const RISALAT_QUERY_KEY = ['guilds', 'mine', 'risalat'] as const;

async function fetchRisalat(): Promise<Risalat> {
  return queryOrFailure(() => api.GET('/api/guilds/mine/risalat'));
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
  return useQuery({
    queryKey: RISALAT_QUERY_KEY,
    queryFn: fetchRisalat,
  });
}
