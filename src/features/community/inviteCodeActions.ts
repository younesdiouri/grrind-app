import { api } from '@/api/client';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import type { GuildInviteCode } from '@/features/community/inviteCodeState';

export type IssueInviteCodeOutcome =
  | { ok: true; code: GuildInviteCode }
  | { ok: false; failure: Failure };

export type RevokeInviteCodeOutcome = { ok: true } | { ok: false; failure: Failure };

/**
 * `POST /api/guilds/{id}/invite-code` — émet un code, et **révoque le précédent dans le même
 * geste** (le contrat le garantit). Ce module n'a donc rien à faire de plus pour tenir
 * l'invariant « une guilde n'a jamais deux codes vivants » : `inviteCodeIssued`, côté écran,
 * ne décide que de l'étiquette (« actif » ou « régénéré »), jamais du geste lui-même.
 */
export async function issueInviteCode(guildId: string): Promise<IssueInviteCodeOutcome> {
  try {
    const { data, error } = await api.POST('/api/guilds/{id}/invite-code', {
      params: { path: { id: guildId } },
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, code: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}

/**
 * `DELETE /api/guilds/{id}/invite-code` — ferme la guilde à l'entrée. La réponse est un `204`
 * sans corps, qu'il y ait eu ou non un code à couper (le contrat le garantit) : ce module ne
 * distingue donc pas les deux cas, et n'a **rien** à lire dans la réponse au succès.
 */
export async function revokeInviteCode(guildId: string): Promise<RevokeInviteCodeOutcome> {
  try {
    const { error } = await api.DELETE('/api/guilds/{id}/invite-code', {
      params: { path: { id: guildId } },
    });

    if (error !== undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}
