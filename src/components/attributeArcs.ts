import type { Attribute } from '@/design/tokens';

/**
 * La répartition d'un cercle de vie — quatre arcs, un par caractéristique, dont la longueur
 * est la **part** de cette caractéristique dans le total des quatre.
 *
 * Pure, sans React : prouvée sur ses cas limites dans `attributeArcs.test.ts` sans monter
 * `AttributeRing`. Ce n'est pas une règle de jeu — le serveur a déjà décidé les valeurs,
 * `Progression.attributes` — seulement l'arithmétique qui en tire des fractions de tour.
 *
 * Le nom diffère de celui du composant par plus qu'une casse, volontairement : `AttributeRing`
 * et `attributeRing` ne peuvent pas coexister dans ce dossier — `tsc` refuse deux fichiers qui
 * ne diffèrent que par la casse (TS1149), portabilité oblige. Même écart que `guildCapacity.ts`
 * / `CapacityGauge.tsx`, son modèle.
 */
export type AttributeArc = {
  attribute: Attribute;
  /** Fraction de tour, entre 0 et 1. */
  from: number;
  to: number;
};

/**
 * L'ordre du contrat. Jamais trié, jamais réordonné — voir `RewardSummary.attributes`.
 * Exporté pour `AttributeLegend`, qui rend les quatre lignes dans le même ordre que les arcs,
 * part nulle comprise.
 *
 * Écrit comme `attributeLabel`/`attributeColor` — un `Record<Attribute, …>`, pas un tableau à
 * la main — pour la même raison : un tableau littéral pourrait oublier une cinquième
 * caractéristique sans que rien ne le remarque, et elle serait alors simplement absente du
 * cercle et de la légende, en silence. Le `Record` force le compilateur à casser le jour où
 * `Attribute` en gagne une ; `Object.keys` en tire l'ordre, comme `DISCIPLINES` le fait de
 * `disciplineLabel` dans `src/design/previews.tsx`.
 */
const ATTRIBUTE_ORDER_KEYS: Record<Attribute, true> = {
  strength: true,
  endurance: true,
  mobility: true,
  dexterity: true,
};

export const ATTRIBUTE_ORDER = Object.keys(ATTRIBUTE_ORDER_KEYS) as Attribute[];

export function arcsOf(attributes: Record<Attribute, number>): AttributeArc[] {
  const total = ATTRIBUTE_ORDER.reduce((sum, attribute) => sum + attributes[attribute], 0);

  if (total <= 0) {
    return [];
  }

  const arcs: AttributeArc[] = [];
  // La borne de chaque arc se lit sur la somme **cumulée**, divisée par `total` une fois par
  // arc — jamais sur une fraction déjà arrondie qu'on additionnerait. C'est ce qui garantit
  // que le dernier arc finit exactement à 1 : `cumulative` vaut alors `total` au bit près
  // (même séquence d'additions que celle qui a produit `total`), et `total / total` ne
  // s'arrondit jamais.
  let cumulative = 0;

  for (const attribute of ATTRIBUTE_ORDER) {
    const value = attributes[attribute];
    // Une part nulle ne dessine rien : ni trait, ni écart entre ses deux voisines.
    if (value <= 0) {
      continue;
    }

    const from = cumulative / total;
    cumulative += value;
    arcs.push({ attribute, from, to: cumulative / total });
  }

  return arcs;
}
