import { useEffect } from 'react';
import { AppState } from 'react-native';
import { focusManager, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { nextWeeklyRefreshAt, noteProgressionStale } from './weeklyRefresh.ts';

/** Un seul abonnement dans la coquille connectée, y compris quand l’accueil est masqué. */
export function useProgressionRefresh(userId: string | null) {
  const client = useQueryClient();
  useEffect(() => userId === null ? undefined : watchProgressionRefresh(client, userId), [client, userId]);
}

export function watchProgressionRefresh(client: QueryClient, userId: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = (refetchType: 'active' | 'none' = 'active') => {
    noteProgressionStale();
    void client.invalidateQueries({ refetchType, predicate: ({ queryKey }) =>
      queryKey[1] === userId && ['inventory', 'players', 'alam', 'guilds'].includes(String(queryKey[0])) });
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (AppState.currentState === 'active') refresh();
      schedule();
    }, nextWeeklyRefreshAt(Date.now()) - Date.now());
  };
  focusManager.setFocused(AppState.currentState === 'active');
  schedule();
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') { refresh('none'); schedule(); }
    focusManager.setFocused(state === 'active');
  });
  return () => { clearTimeout(timer); subscription.remove(); focusManager.setFocused(undefined); };
}
