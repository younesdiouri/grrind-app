import { queryOptions, useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useSyncExternalStore } from 'react';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { UserProfile } from '@/features/auth/session';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { getSettledRevision, subscribeToSync } from '@/features/health/sync';
import type { StatsPeriod, WorkoutStats } from './workoutStats';

export function workoutStatsOptions(user: Pick<UserProfile, 'id' | 'timezone'> | null, period: StatsPeriod, revision: number) {
  return queryOptions<WorkoutStats, Failure>({
    queryKey: ['workout-stats', user?.id, period, user?.timezone, revision],
    enabled: user !== null,
    queryFn: ({ signal }) => queryOrFailure(() => api.GET('/api/workouts/stats', {
      params: { query: { period } }, signal,
    })),
    // La borne serveur suit le jour du profil, y compris aux changements DST.
    refetchInterval: query => query.state.data && !query.state.error
      ? Math.max(1000, Date.parse(query.state.data.observedEnd) - Date.now()) : false,
    refetchIntervalInBackground: false,
  });
}

export function useWorkoutStats(period: StatsPeriod) {
  const auth = useAuth();
  const focused = useIsFocused();
  const revision = useSyncExternalStore(subscribeToSync, getSettledRevision);
  const user = auth.status === 'signedIn' ? auth.user : null;
  return useQuery({ ...workoutStatsOptions(user, period, revision), enabled: focused && user !== null });
}
