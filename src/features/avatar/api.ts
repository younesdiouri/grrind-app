import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import type { Avatar } from '@/features/combat/serverAvatar';
import type { UserProfile } from '@/features/notifications/preferences';

export async function fetchAvatarCatalog() {
  return queryOrFailure(() => api.GET('/api/avatar-catalog'));
}

export async function saveAvatar(avatar: Avatar): Promise<{ ok: true; profile: UserProfile } | { ok: false; failure: Failure }> {
  const { version, body, faceStyle, noseStyle, hairStyle, skinTone, eyeColor, hairColor } = avatar;
  try {
    const { data, error } = await api.PATCH('/api/me', { body: {
      displayName: null, timezone: null, locale: null, appearance: null, notificationPreferences: [],
      avatar: { version, body, faceStyle, noseStyle, hairStyle, skinTone, eyeColor, hairColor },
    } });
    return data === undefined ? { ok: false, failure: failureFrom(error) } : { ok: true, profile: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}
