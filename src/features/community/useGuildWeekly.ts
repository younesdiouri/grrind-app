import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { queryForOwner } from '@/api/privateQueries';
import { useAuth } from '@/features/auth/useAuth';
import { myGuildQueryKey } from './useMyGuild.ts';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

export const guildWeeklyQueryKey = (userId: string | null) => [...myGuildQueryKey(userId), 'weekly-leaderboard'] as const;

export function guildWeeklyOptions(userId: string | null, guildId: string) {
  return queryOptions<components['schemas']['GuildWeeklyLeaderboard'], Failure>({
    queryKey: [...guildWeeklyQueryKey(userId), guildId], enabled: userId !== null,
    queryFn: ({ signal }) => queryForOwner(userId, () => queryOrFailure(() => api.GET('/api/guilds/mine/weekly-leaderboard', { signal }))),
  });
}

export function useGuildWeekly(guildId: string) {
  const auth = useAuth();
  return useQuery(guildWeeklyOptions(auth.status === 'signedIn' ? auth.user.id : null, guildId));
}
