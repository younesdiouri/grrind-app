import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';

export const GUILD_WEEKLY_QUERY_KEY = ['guilds', 'mine', 'weekly-leaderboard'] as const;

export function useGuildWeekly(guildId: string) {
  return useQuery<components['schemas']['GuildWeeklyLeaderboard'], Failure>({
    queryKey: [...GUILD_WEEKLY_QUERY_KEY, guildId],
    queryFn: () => queryOrFailure(() => api.GET('/api/guilds/mine/weekly-leaderboard')),
  });
}
