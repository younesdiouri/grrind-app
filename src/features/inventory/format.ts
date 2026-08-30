import type { components } from '@/api/schema';
import { disciplineLabel, modifierLabel } from '@/design/tokens';

type DroppedItemModifier = components['schemas']['DroppedItemModifier'];

/**
 * Un modificateur d'objet, mis en phrase — « Endurance +1200 », « XP +8 % · Course
 * seulement ».
 *
 * ————— Les unités viennent du contrat, elles ne se devinent pas ——————————————————————
 *
 * `DroppedItemModifier.value` est « un entier dont l'unité dépend de `type` » (dixit son
 * docblock) : ce module ne fait qu'écrire noir sur blanc la table que ce commentaire laisse
 * implicite, treize fois.
 *
 * - `XP_MULTIPLIER`, `LOOT_LUCK` sont déjà des pourcentages.
 * - Les quatre bonus de caractéristique (`STRENGTH_BONUS`…) sont des **points d'XP
 *   répartis** — l'unité du ledger, celle des jauges du cercle de vie. « +1000 » s'y lit à
 *   l'échelle de ce qu'une séance rapporte, jamais comme un score abstrait.
 * - `HP_BONUS`, `DAMAGE_BONUS` sont des points, déjà l'effet final — rien à convertir.
 * - `MITIGATION_BONUS`, `EXTRA_TURN_BONUS`, `DODGE_BONUS` sont des **millièmes**, et c'est
 *   une décision d'affichage de ce ticket de les rendre en pourcentage avec une décimale :
 *   un joueur ne lit pas « +180 ‰ », et le seul taux qu'on lui montre déjà — celui d'un
 *   combattant, sur `EnemyCard` — est un pourcentage. La conversion s'arrête à l'écran ; le
 *   client ne recompose aucun taux de combat, il en affiche un qui arrive résolu du serveur.
 * - `STREAK_SHIELD` compte des charges.
 * - `UNLOCK_SESSION_TYPE` n'a encore aucun objet qui le porte : sa valeur n'a pas de sens
 *   connu, et ce module refuse de l'inventer. Seul le nom de l'effet s'affiche.
 *
 * ————— La portée ——————————————————————————————————————————————————————————————————————
 *
 * `discipline === null` veut dire « partout » et ne se dit pas ; une discipline précise se
 * lit **sur la même ligne**, en suffixe — des bottes qui ne servent qu'à la course sont la
 * moitié de ce que l'objet vaut, le taire rendrait deux objets identiques à l'écran.
 */
export function formatModifier(modifier: DroppedItemModifier): string {
  const label = modifierLabel[modifier.type];
  const magnitude = formatMagnitude(modifier.type, modifier.value);
  const base = magnitude === null ? label : `${label} ${magnitude}`;

  if (modifier.discipline === null) {
    return base;
  }

  return `${base} · ${disciplineLabel[modifier.discipline]} seulement`;
}

/** `null` pour l'effet qui n'a pas de grandeur affichable — voir le docblock ci-dessus. */
function formatMagnitude(type: DroppedItemModifier['type'], value: number): string | null {
  switch (type) {
    case 'XP_MULTIPLIER':
    case 'LOOT_LUCK':
      return `+${value} %`;

    case 'STRENGTH_BONUS':
    case 'ENDURANCE_BONUS':
    case 'MOBILITY_BONUS':
    case 'DEXTERITY_BONUS':
    case 'HP_BONUS':
    case 'DAMAGE_BONUS':
      return `+${value}`;

    case 'MITIGATION_BONUS':
    case 'EXTRA_TURN_BONUS':
    case 'DODGE_BONUS':
      return `+${(value / 10).toFixed(1).replace('.', ',')} %`;

    case 'STREAK_SHIELD':
      return `+${value} ${value === 1 ? 'charge' : 'charges'}`;

    case 'UNLOCK_SESSION_TYPE':
      return null;

    default:
      return unnamedModifier(type);
  }
}

/**
 * Le repli sur un effet que ce client ne connaît pas.
 *
 * Le paramètre est typé `never` : ajouter un `type` au contrat casse le build ici, comme
 * `unnamedProblem` le fait pour un problème RFC 9457 (`features/auth/problems.ts`). À
 * l'exécution, il ne reçoit que ce qu'un back plus récent que l'app installée a bien voulu
 * envoyer — on préfère une ligne pauvre à un modificateur muet.
 */
function unnamedModifier(type: never): string {
  return `+${String(type)}`;
}
