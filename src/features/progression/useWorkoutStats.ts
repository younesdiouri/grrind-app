import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { getSettledRevision, subscribeToSync } from '@/features/health/sync';
import { statsWindow, type StatsDays } from './workoutStats';

/** Une fenêtre complète : aucun total n'est publié tant qu'il reste un curseur. */
export function useWorkoutStats(days: StatsDays, now: Date) {
  const auth = useAuth();
  const revision = useSyncExternalStore(subscribeToSync, getSettledRevision);
  const { previousStart, end } = statsWindow(days, now);
  const from = previousStart.toISOString();
  const to = end.toISOString();
  return useQuery<components['schemas']['Workout'][], Failure>({
    queryKey: ['workout-stats', auth.status === 'signedIn' ? auth.user.id : null, from, to, revision],
    enabled: auth.status === 'signedIn',
    queryFn: async ({ signal }) => {
      const workouts: components['schemas']['Workout'][] = [];
      let cursor: string | undefined;
      do {
        const page = await queryOrFailure(() => api.GET('/api/workouts', {
          params: { query: { from, to, limit: 50, cursor } }, signal,
        }));
        workouts.push(...page.workouts);
        cursor = page.nextCursor ?? undefined;
      } while (cursor !== undefined);
      return workouts;
    },
  });
}
