import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/useAuth';
import type { Failure } from '@/features/auth/problems';
import { fetchProfile, type UserProfile } from '@/features/notifications/preferences';

export const avatarProfileKey = (id: string) => ['profile', id] as const;

/** Account-scoped cache: a save updates every own-profile view, never another account. */
export function useAvatarProfile(): UseQueryResult<UserProfile, Failure> {
  const auth = useAuth();
  return useQuery({ queryKey: avatarProfileKey(auth.status === 'signedIn' ? auth.user.id : ''),
    enabled: auth.status === 'signedIn',
    queryFn: async () => {
      const result = await fetchProfile();
      if (!result.ok) throw result.failure;
      return result.profile;
    },
  });
}
