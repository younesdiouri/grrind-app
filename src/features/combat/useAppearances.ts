import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import type { Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { ENEMY_IMAGE_TIMEOUT_MS } from './enemyPresentation';

/** Un chargement partagé pour toute la session, via le cache déjà installé. */
export function useAppearances() {
  const auth = useAuth();
  return useQuery<components['schemas']['AppearanceCatalog'], Failure>({
    queryKey: ['appearances', auth.status === 'signedIn' ? auth.user.id : null],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ENEMY_IMAGE_TIMEOUT_MS);
      try { return await queryOrFailure(() => api.GET('/api/appearances', { signal: controller.signal })); }
      finally { clearTimeout(timeout); }
    },
    enabled: auth.status === 'signedIn', staleTime: Infinity, gcTime: Infinity, retry: false,
  });
}
