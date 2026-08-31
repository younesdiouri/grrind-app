import type { components } from '@/api/schema';
import { disciplineLabel, modifierLabel } from '@/design/tokens';
import { formatWhen } from '@/features/progression/format';

type DroppedItemModifier = components['schemas']['DroppedItemModifier'];

/**
 * Quand un mouvement du ledger de pièces a eu lieu — **passe par `formatWhen`, ne le recopie
 * pas**. « Quand ce mouvement s'est-il produit » est exactement la question que se posent déjà
 * l'historique des séances et celui des combats (`combat/format.ts`), et elle appelle la même
 * réponse : aujourd'hui et hier avec l'heure, la date seule au-delà.
 *
 * `occurredAt` est la date du **fait** — la séance ou le combat qui a produit l'écriture —, pas
 * celle de l'insertion en base. Dix séances importées d'un coup se rangent à dix journées
 * différentes ; l'instant de l'écriture vit dans l'UUID v7 de la ligne et n'a rien à faire ici.
 */
export function formatOccurredAt(occurredAt: string, now: Date): string {
  return formatWhen(occurredAt, now);
}

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
 * ————— Le signe ——————————————————————————————————————————————————————————————————————
 *
 * **Il vient de la valeur, jamais écrit devant.** Rien dans le contrat ne garantit `value`
 * positif — c'est « un entier dont l'unité dépend de `type` » — et le back a annoncé le cas
 * (younesdiouri/grrind-back#224) : un bonus négatif, une malédiction plus tard, ne doit pas
 * pouvoir produire un combattant à zéro point de vie. Préfixer `+` sans condition afficherait
 * alors `+-350`. `signPrefix` est le seul endroit qui décide du signe ; les quatre branches
 * qui affichent un nombre l'appellent plutôt que d'écrire `+` en dur.
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
      return `${signPrefix(value)}${value} %`;

    case 'STRENGTH_BONUS':
    case 'ENDURANCE_BONUS':
    case 'MOBILITY_BONUS':
    case 'DEXTERITY_BONUS':
    case 'HP_BONUS':
    case 'DAMAGE_BONUS':
      return `${signPrefix(value)}${value}`;

    case 'MITIGATION_BONUS':
    case 'EXTRA_TURN_BONUS':
    case 'DODGE_BONUS':
      return `${signPrefix(value)}${(value / 10).toFixed(1).replace('.', ',')} %`;

    case 'STREAK_SHIELD':
      return `${signPrefix(value)}${value} ${value === 1 ? 'charge' : 'charges'}`;

    case 'UNLOCK_SESSION_TYPE':
      return null;

    default:
      return unnamedModifier(type);
  }
}

/**
 * `+` devant un nombre positif ou nul, rien devant un négatif — qui porte déjà son signe.
 * Sans ce garde-fou, un bonus négatif comme `-350` s'afficherait `+-350` : la même règle que
 * `BreakdownRow` applique déjà pour une ligne de breakdown, ici factorisée une fois pour les
 * quatre branches qui préfixent un nombre ci-dessus.
 */
function signPrefix(value: number): string {
  return value < 0 ? '' : '+';
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
