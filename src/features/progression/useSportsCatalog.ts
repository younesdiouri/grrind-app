import { queryOptions, useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { api } from '@/api/client';
import { ACCEPT_LANGUAGE } from '@/api/languageMiddleware';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import type { SportCatalog } from './sports';

export function sportsCatalogOptions(userId: string | null) {
  return queryOptions<SportCatalog, Failure>({
    queryKey: ['sports-catalog', userId, ACCEPT_LANGUAGE],
    enabled: userId !== null,
    staleTime: 0,
    // Le transport peut revalider son cache HTTP ; aucun ETag ni barème conservé à la main.
    queryFn: ({ signal }) => queryOrFailure(() => api.GET('/api/sports', { signal, cache: 'no-cache' })),
  });
}

export function useSportsCatalog() {
  const auth = useAuth();
  const focused = useIsFocused();
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  return useQuery({ ...sportsCatalogOptions(userId), enabled: focused && userId !== null });
}
