import type { components } from '@/api/schema';

export type Progression = components['schemas']['Progression'];

/**
 * Ce que le widget lit — la **seule** description de cette forme, pour les deux processus.
 *
 * ————— Pourquoi un instantané et pas un accès au serveur ————————————————————————————————
 *
 * Le widget est une extension : un processus distinct, sans le bundle JavaScript, sans le
 * trousseau de l'app, sans sa session. Lui donner de quoi appeler l'API voudrait dire lui
 * donner de quoi rafraîchir un jeton — et le refresh token est à usage unique, rotatif et
 * groupé par famille, donc deux rafraîchissements concurrents déconnectent l'appareil
 * (invariant n°1 de `CLAUDE.md`). La promesse partagée qui sérialise les nôtres ne traverse
 * pas une frontière de processus. L'app écrit donc, et l'extension lit.
 *
 * ————— Pourquoi tout est précalculé ici ————————————————————————————————————————————————
 *
 * Tout ce que ce module décide est faux ou juste **sans appareil** : la barre au niveau
 * maximum, un palier de largeur nulle, les libellés. Ce qui est laissé au Swift est ce qui ne
 * peut pas être décidé à l'avance — la mise en page, et l'âge de l'instantané, qui dépend de
 * l'instant où l'écran d'accueil le regarde.
 *
 * ————— Pourquoi `version` ————————————————————————————————————————————————————————————
 *
 * L'app et son widget se mettent à jour ensemble, mais pas au même instant : iOS garde
 * l'ancienne extension vivante un moment après le remplacement de l'app. Un champ ajouté ou
 * renommé se lirait alors dans un décodeur qui ne le connaît pas. Le widget refuse alors
 * l'instantané et retombe sur son état vide — « ouvre GRRIND » — plutôt que d'afficher des
 * zéros, qui se liraient comme une régression du personnage.
 */
export const SNAPSHOT_VERSION = 1;

/** Les quatre caractéristiques créditées. Vitality n'en est pas : elle s'en dérive. */
export type AttributeKey = 'strength' | 'endurance' | 'mobility' | 'dexterity';

export type WidgetSnapshot = {
  version: number;
  level: number;
  /** Le titre équipé, ou `null` — le widget écrit alors le niveau seul, il n'invente rien. */
  title: string | null;
  xpIntoLevel: number;
  /** `null` au niveau maximum, et c'est la seule chose qui distingue une barre pleine d'une barre finie. */
  xpToNextLevel: number | null;
  /** Déjà borné à [0, 1] : une barre ne se calcule pas deux fois, et surtout pas dans deux langages. */
  progress: number;
  vitality: number;
  attributes: { key: AttributeKey; label: string; value: number }[];
  /**
   * Quand ces chiffres ont été lus au serveur, en ISO 8601.
   *
   * **Une date et pas un texte déjà formaté** : « il y a 2 min » écrit ici serait encore lu
   * « il y a 2 min » quatre heures plus tard, puisque le widget relit un fichier qui, lui, n'a
   * pas bougé. L'âge se calcule au moment du rendu, côté Swift, ou il ment.
   */
  capturedAt: string;
};

/** L'ordre est celui du cercle de vie (#69), et il ne se trie pas à l'affichage. */
const ATTRIBUTE_LABELS: { key: AttributeKey; label: string }[] = [
  { key: 'strength', label: 'Force' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'mobility', label: 'Mobilité' },
  { key: 'dexterity', label: 'Dextérité' },
];

/**
 * L'état du joueur, réduit à ce qui tient sur un écran d'accueil.
 *
 * `now` est passé plutôt que lu : c'est ce qui rend la fonction pure, donc prouvable sans
 * horloge réelle — même raison que `windowStart` dans `syncState.ts`.
 */
export function snapshotFrom(progression: Progression, now: Date): WidgetSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    level: progression.level,
    title: progression.activeTitle?.name ?? null,
    xpIntoLevel: progression.xpIntoLevel,
    xpToNextLevel: progression.xpToNextLevel,
    progress: fillOf(progression.xpIntoLevel, progression.xpToNextLevel),
    vitality: progression.attributes.vitality,
    attributes: ATTRIBUTE_LABELS.map(({ key, label }) => ({
      key,
      label,
      value: progression.attributes[key],
    })),
    capturedAt: now.toISOString(),
  };
}

/**
 * Où en est la barre, entre 0 et 1.
 *
 * Deux cas rendent **1** et il faut les deux : le niveau maximum (`xpToNextLevel` à `null`,
 * il n'y a plus rien à remplir) et un palier de largeur nulle, qu'un rééquilibrage peut
 * produire — diviser par zéro donnerait `NaN`, que `JSON.stringify` écrit `null`, et le widget
 * afficherait une barre vide à quelqu'un qui vient de monter de niveau.
 *
 * Le même calcul existe sur `RewardSummary` dans `reward/timeline.ts` et à l'accueil dans
 * `PlayerHomeView.tsx`. Ce n'est pas un oubli : les rapprocher est un vrai sujet, mais il
 * dépasse ce ticket.
 */
function fillOf(xpIntoLevel: number, xpToNextLevel: number | null): number {
  if (xpToNextLevel === null) {
    return 1;
  }

  const span = xpIntoLevel + xpToNextLevel;

  if (span <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0, xpIntoLevel / span));
}
