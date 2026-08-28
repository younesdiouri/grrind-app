import type { Failure } from '@/features/auth/problems';

/**
 * Les six refus que peut rendre `PUT /api/guilds/mine/risalat/turn`, chacun avec sa suite —
 * le tableau du ticket #106, sur le modèle de `joinRefusal.ts` qui fait déjà exactement ça
 * pour le ralliement.
 *
 * Comme `joinRefusalFrom`, ce module ne porte **aucun texte** : `messageFor` s'en charge,
 * ici comme partout ailleurs. Il ne choisit que la mise en scène.
 *
 * ————— Pourquoi quatre mises en scène pour six `type` —————————————————————————————————————
 *
 * `discipline-does-not-credit` et `discipline-already-challenged` ne sont atteignables depuis
 * cet écran qu'avec une `choosable` périmée — le serveur valide le choix avec la même liste
 * qu'il a rendue, donc les deux ne peuvent survenir que si elle a changé sous nos pieds. Leur
 * traitement est identique : rafraîchir la liste, laisser rechoisir. `risala-turn-is-not-open`
 * et `risala-turn-is-not-yours` disent la même chose de deux façons — il n'y a plus de tour à
 * répondre, sur cet écran comme sur un autre — et reculent tous les deux vers le bloc.
 *
 * `risala-turn-is-closed` reste seul : c'est le seul des six qui **ferme**, l'échéance est
 * passée pendant qu'on choisissait, et rien ne se réessaie. `guild-not-found` reste seul
 * aussi : ce n'est pas le tour qui a disparu, c'est la guilde entière.
 */
export type TurnRefusal =
  | { kind: 'turn-closed' }
  | { kind: 'choosable-stale' }
  | { kind: 'turn-gone' }
  | { kind: 'guild-gone' }
  | { kind: 'other' };

export function turnRefusalFrom(failure: Failure): TurnRefusal {
  if (failure.kind === 'offline') {
    return { kind: 'other' };
  }

  switch (failure.problem.type) {
    case 'https://grrind.app/problems/risala-turn-is-closed':
      return { kind: 'turn-closed' };

    case 'https://grrind.app/problems/discipline-does-not-credit':
    case 'https://grrind.app/problems/discipline-already-challenged':
      return { kind: 'choosable-stale' };

    case 'https://grrind.app/problems/risala-turn-is-not-open':
    case 'https://grrind.app/problems/risala-turn-is-not-yours':
      return { kind: 'turn-gone' };

    case 'https://grrind.app/problems/guild-not-found':
      return { kind: 'guild-gone' };

    default:
      return { kind: 'other' };
  }
}
