import type { Failure } from '@/features/auth/problems';

/**
 * Les quatre refus de `POST /api/guilds/join`, chacun avec son écran — le tableau du ticket
 * #42. `invite-code-not-usable` couvre volontairement **trois causes sous un seul nom**
 * (inconnu, expiré, révoqué) : les distinguer dirait quels codes existent.
 *
 * Ce module ne porte **aucun texte** : le message vient de `messageFor`, ici comme partout
 * ailleurs dans le client. Il ne sert qu'à choisir la mise en scène — quel bouton, quel
 * chiffre à composer — pas la phrase.
 *
 * Tout le reste — hors ligne, 422, panne interne, une panne que ce client ne connaît pas
 * encore — tombe dans `other` : ce ne sont pas des situations de jeu prévues par le ticket,
 * juste des pannes, et leur exhaustivité est déjà garantie ailleurs, par le `switch` de
 * `messageFor`.
 */
export type JoinRefusal =
  | { kind: 'invite-code-not-usable' }
  | { kind: 'player-already-in-a-guild' }
  /**
   * `capacity` voyage dans le corps du problème (`ProblemDetails` a un index ouvert) et sert
   * **deux fois** — numérateur et dénominateur — puisqu'une guilde n'est complète que quand
   * son effectif a atteint sa capacité. `null` si le serveur ne l'a pas transmise : mieux vaut
   * un message sans chiffre qu'un chiffre inventé.
   */
  | { kind: 'guild-is-full'; capacity: number | null }
  | { kind: 'too-many-requests' }
  | { kind: 'other' };

export function joinRefusalFrom(failure: Failure): JoinRefusal {
  if (failure.kind === 'offline') {
    return { kind: 'other' };
  }

  switch (failure.problem.type) {
    case 'https://grrind.app/problems/invite-code-not-usable':
      return { kind: 'invite-code-not-usable' };

    case 'https://grrind.app/problems/player-already-in-a-guild':
      return { kind: 'player-already-in-a-guild' };

    case 'https://grrind.app/problems/guild-is-full':
      return { kind: 'guild-is-full', capacity: capacityFrom(failure.problem.capacity) };

    case 'https://grrind.app/problems/too-many-requests':
      return { kind: 'too-many-requests' };

    default:
      return { kind: 'other' };
  }
}

function capacityFrom(raw: unknown): number | null {
  return typeof raw === 'number' ? raw : null;
}
