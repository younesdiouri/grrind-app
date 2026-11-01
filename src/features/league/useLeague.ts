import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { Failure } from '@/features/auth/problems';
import { fetchLeague } from './api';
import { leaguePollDelay, type LeagueState } from './league';

export function useLeague(userId: string | undefined, enabled: boolean) {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);
  const active = enabled && foreground && !!userId;
  return useQuery<LeagueState, Failure>({
    queryKey: ['league', userId], queryFn: fetchLeague, enabled: active,
    refetchInterval: query => active ? leaguePollDelay(query.state.data, Date.now()) : false,
    refetchIntervalInBackground: false,
  });
}
