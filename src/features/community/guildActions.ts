import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import type { GuildDetail } from '@/features/community/useMyGuild';

export type Guild = components['schemas']['Guild'];

export type GuildActionOutcome = { ok: true; guild: Guild } | { ok: false; failure: Failure };

export type GuildRefreshOutcome =
  | { ok: true; guild: GuildDetail }
  | { ok: false; failure: Failure };

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

/**
 * `GET /api/guilds/{id}` — le rafraîchissement de l'écran des membres, **distinct** de
 * `/api/guilds/mine`.
 *
 * `/mine` reste la porte de l'onglet (#42) : elle rend `{ "guild": null }` avec un 200 quand
 * le joueur n'a pas de guilde, elle ne peut donc jamais dire qu'*une* guilde a disparu, elle
 * ne fait que constater qu'on n'en a plus. `/guilds/{id}` parle d'une guilde précise : « ici
 * la guilde existe forcément, puisqu'un non-membre reçoit 404 » (description du contrat) —
 * c'est cette route qui rend `guild-not-found` quand le fondateur vient de dissoudre pendant
 * qu'on regardait la liste, et c'est donc elle qu'un tirer-pour-rafraîchir doit appeler.
 * `isGuildGone`, dans `guildRefresh.ts`, reconnaît ce refus précis.
 */
export async function refreshGuild(id: string): Promise<GuildRefreshOutcome> {
  try {
    const { data, error } = await api.GET('/api/guilds/{id}', { params: { path: { id } } });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, guild: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}
