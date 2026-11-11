import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { getSettledRevision, subscribeToSync } from '@/features/health/sync';
import { getProgressionRevision, subscribeToProgression } from '@/features/progression/weeklyRefresh';

export function useWeekTrainingPlan(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  const auth = useAuth();
  const revision = useSyncExternalStore(subscribeToSync, getSettledRevision);
  const weekRevision = useSyncExternalStore(subscribeToProgression, getProgressionRevision);
  const query = useQuery<components['schemas']['WeekProgress'], Failure>({
    queryKey: ['week-training-plan', auth.status === 'signedIn' ? auth.user.id : null, revision, weekRevision],
    enabled: enabled && auth.status === 'signedIn',
    queryFn: () => queryOrFailure(() => api.GET('/api/progression/week')),
  });
  const plan = query.data?.trainingPlan;
  const refetch = query.refetch;
  useEffect(() => {
    if (!enabled || !plan) return;
    const delay = Date.parse(plan.expiresAt) - Date.now();
    const timer = setTimeout(() => {
      setNow(Date.now());
      if (delay > 0) void refetch();
    }, Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [enabled, plan, refetch]);
  return { plan: plan && Date.parse(plan.expiresAt) > now ? plan : null, refreshPlan: refetch };
}
