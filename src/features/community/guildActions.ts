import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';

export type Guild = components['schemas']['Guild'];

export type GuildActionOutcome = { ok: true; guild: Guild } | { ok: false; failure: Failure };

/**
 * `POST /api/guilds` — fonder, et devenir fondateur dans le même geste.
 *
 * Le nom **n'est pas unique** et ne le sera jamais : on n'entre dans une guilde que par un
 * code d'invitation, donc rien ne dépend de pouvoir la désigner par son nom. Ce module ne
 * vérifie donc rien à ce sujet — l'écran non plus.
 */
export async function foundGuild(name: string): Promise<GuildActionOutcome> {
  try {
    const { data, error } = await api.POST('/api/guilds', { body: { name } });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, guild: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}

/**
 * `POST /api/guilds/join` — le code, sans autre identifiant : c'est lui qui désigne la
 * guilde, et c'est tout ce que ce module envoie. La normalisation de la saisie (casse,
 * espaces) vit dans `inviteCode.ts`, en amont, pas ici.
 */
export async function joinGuild(code: string): Promise<GuildActionOutcome> {
  try {
    const { data, error } = await api.POST('/api/guilds/join', { body: { code } });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, guild: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}
