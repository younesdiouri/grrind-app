import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';

/** Un chargement partagé pour toute la session, via le cache déjà installé. */
export function useAppearances() {
  const auth = useAuth();
  return useQuery<components['schemas']['AppearanceCatalog'], Failure>({
    queryKey: ['appearances', auth.status === 'signedIn' ? auth.user.id : null],
    queryFn: () => queryOrFailure(() => api.GET('/api/appearances')),
    enabled: auth.status === 'signedIn', staleTime: Infinity,
  });
}
