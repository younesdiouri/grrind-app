import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';

export type UserProfile = components['schemas']['UserProfile'];

export type FetchProfileOutcome = { ok: true; profile: UserProfile } | { ok: false; failure: Failure };

/**
 * `GET /api/me` — le profil courant, `notificationPreferences` compris. C'est **la** map
 * complète de toutes les catégories connues du back, jamais seulement celles coupées (#132) :
 * `reglages.tsx` la rend telle quelle, sans en présumer le contenu.
 */
export async function fetchProfile(): Promise<FetchProfileOutcome> {
  try {
    const { data, error } = await api.GET('/api/me');

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, profile: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}

export type UpdateNotificationPreferenceOutcome =
  | { ok: true; profile: UserProfile }
  | { ok: false; failure: Failure };

/**
 * `PATCH /api/me` — une catégorie à la fois. `displayName` et `timezone` restent `null` :
 * ce sont les champs absents du geste, et le contrat dit qu'un champ absent n'est pas touché.
 *
 * `category` est une clé de `notificationPreferences`, c'est-à-dire une chaîne lue sur la
 * réponse du serveur — jamais une valeur choisie dans `NotificationCategory` ici : la rendre
 * telle quelle plutôt que de la revalider est ce qui permet à une catégorie que le client ne
 * connaît pas encore de continuer à s'écrire correctement.
 */
export async function updateNotificationPreference(
  category: string,
  enabled: boolean,
): Promise<UpdateNotificationPreferenceOutcome> {
  try {
    const { data, error } = await api.PATCH('/api/me', {
      body: {
        displayName: null,
        timezone: null,
        locale: null,
        notificationPreferences: [
          { category: category as components['schemas']['NotificationCategory'], enabled },
        ],
      },
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, profile: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}
