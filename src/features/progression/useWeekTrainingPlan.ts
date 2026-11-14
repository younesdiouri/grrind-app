import { queryOptions, useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { getSettledRevision, subscribeToSync } from '@/features/health/sync';
import { getProgressionRevision, subscribeToProgression } from '@/features/progression/weeklyRefresh';

export function weekTrainingPlanOptions(userId: string | null, revision: number, weekRevision: number) {
  return queryOptions<components['schemas']['WeekProgress'], Failure>({
    queryKey: ['week-training-plan', userId, revision, weekRevision],
    enabled: userId !== null,
    queryFn: ({ signal }) => queryOrFailure(() => api.GET('/api/progression/week', { signal })),
  });
}

export function useWeekTrainingPlan() {
  const [, tick] = useState(0);
  const auth = useAuth();
  const focused = useIsFocused();
  const revision = useSyncExternalStore(subscribeToSync, getSettledRevision);
  const weekRevision = useSyncExternalStore(subscribeToProgression, getProgressionRevision);
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  const active = focused && userId !== null;
  const query = useQuery({ ...weekTrainingPlanOptions(userId, revision, weekRevision), enabled: active });
  const expiresAt = query.data?.trainingPlans[0]?.expiresAt;
  const refetch = query.refetch;
  useEffect(() => {
    if (!active || !expiresAt) return;
    return watchTrainingPlanExpiry(expiresAt, () => {
      tick(value => value + 1);
      void refetch();
    });
  }, [active, expiresAt, refetch]);
  return { ...query, now: new Date() };
}

export function watchTrainingPlanExpiry(expiresAt: string, refresh: () => void) {
  const delay = Date.parse(expiresAt) - Date.now();
  // Un cache déjà expiré est relu à l'ouverture ; ne pas boucler sur une réponse périmée.
  if (delay <= 0) return;
  const timer = setTimeout(refresh, delay);
  return () => clearTimeout(timer);
}
