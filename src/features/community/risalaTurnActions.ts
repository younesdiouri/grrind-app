import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';

type Risalat = components['schemas']['Risalat'];

export type ChooseTurnOutcome = { ok: true; risalat: Risalat } | { ok: false; failure: Failure };

/**
 * `PUT /api/guilds/mine/risalat/turn` — le seul geste actif de la mécanique (#106).
 *
 * Idempotent par nature, comme le contrat le dit : un choix se remplace tant que l'échéance
 * n'est pas passée, il n'y a ni `POST` ni 409 « déjà choisi ». La réponse est **le bloc
 * complet** — « rien à recharger », dit le contrat — et c'est à l'appelant de l'écrire dans
 * le cache de `useRisalat` plutôt que de rejouer un `GET` qui perdrait la course contre
 * l'écran qu'il met à jour.
 *
 * `discipline` vient toujours de `choosable` (younesdiouri/grrind-back#201) : ce module ne
 * fait que la faire passer telle quelle jusqu'au serveur, qui seul valide qu'elle figure
 * encore dans la liste.
 */
export async function chooseRisalaTurn(
  discipline: components['schemas']['Discipline'],
): Promise<ChooseTurnOutcome> {
  try {
    const { data, error } = await api.PUT('/api/guilds/mine/risalat/turn', {
      body: { discipline },
    });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, risalat: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}
