import { ring, type Attribute } from '@/design/tokens';

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
 *
 * Marquée `'worklet'`, comme `arcStroke` : `SyncSummaryView` (#71) l'appelle depuis un
 * `useAnimatedProps`, sur les quatre valeurs *courantes* de la synchronisation plutôt que sur
 * un instantané figé — les parts se redistribuent à chaque image, exactement ce qu'un arc qui
 * grandit ne peut pas capturer seul. Même formule, deux appelants : le rendu statique
 * d'`AttributeRing` sur le thread JS, la mise en scène du lot sur le thread UI.
 */
export type AttributeArc = {
  attribute: Attribute;
  /** Fraction de tour, entre 0 et 1. */
  from: number;
  to: number;
};

/** Les deux tailles du cercle de vie, comme `XpBar` — voir `ringGeometry`. */
export type RingSize = 'inline' | 'hero';

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
  'worklet';
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

export type RingGeometry = {
  radius: number;
  strokeWidth: number;
  /** Le côté du `Svg` qui porte l'anneau. */
  diameter: number;
  /** La coordonnée du centre dans ce `Svg` — `cx`/`cy` de chaque cercle tracé. */
  origin: number;
  /** Le trou du donut, à l'intérieur du trait : l'espace réel où le centre peut se lire. */
  innerDiameter: number;
};

/**
 * Le diamètre d'un cercle de vie, à partir de sa taille (`ring.radius`/`ring.strokeWidth`).
 *
 * `AttributeRing` la consomme pour son propre tracé, et qui l'anime de l'extérieur (#70) en a
 * besoin pour les mêmes raisons : positionner ses propres arcs sur le même cercle, et calculer
 * la taille du centre qu'il fournit par `center`. Sans cette fonction, chaque appelant
 * recalculerait la formule à la main, et les deux copies divergeraient au premier ajustement
 * d'un token — c'est la même raison que celle qui sort `arcsOf` du composant.
 */
export function ringGeometry(size: RingSize, haloSpread = 0): RingGeometry {
  const radius = ring.radius[size];
  const strokeWidth = ring.strokeWidth[size];
  // Le halo est un second trait, plus large, mais ne participe jamais au calcul de l'arc.
  // Le viewport seul s'agrandit : le centre se décale de sa moitié afin que le cercle net
  // garde exactement son rayon, son dash et son offset.
  const diameter = radius * 2 + strokeWidth + haloSpread;

  return {
    radius,
    strokeWidth,
    diameter,
    origin: diameter / 2,
    innerDiameter: radius * 2 - strokeWidth * 2,
  };
}

export type ArcStroke = {
  /** La circonférence du cercle porteur — nécessaire pour composer `strokeDasharray`. */
  circumference: number;
  /** La longueur du trait, bouts ronds compensés. 0 si rien ne doit se dessiner. */
  length: number;
  /** Le décalage à appliquer avec `length` dans `strokeDashoffset`. */
  offset: number;
};

export type ArcPresentation = {
  strokeDasharray: string;
  strokeDashoffset: number;
  /** Un dash nul avec un cap rond dessine un point ; le cap plat reste réellement invisible. */
  strokeLinecap: 'butt' | 'round';
};

/**
 * La géométrie SVG d'un arc, en trait de cercle plutôt qu'en chemin : la longueur voulue puis
 * le vide sur le reste de la circonférence (`strokeDasharray`), décalés du point de départ de
 * l'arc (`strokeDashoffset`). C'est la technique du donut chart — elle évite le calcul des
 * points d'un arc SVG pour ce qui reste, in fine, un simple pourcentage de tour.
 *
 * Les bouts sont ronds (`strokeLinecap="round"`, posé par l'appelant) — le même vocabulaire
 * que `radius.pill` partout ailleurs dans ce design system, plutôt qu'une coupe nette qui
 * détonnerait à côté des pistes et des puces déjà arrondies. Un bout rond **allonge**
 * visuellement le trait de `strokeWidth / 2` à chacune de ses deux extrémités : la longueur
 * dessinée doit donc leur soustraire l'écart voulu **et** l'épaisseur du trait, pas seulement
 * l'écart — sans quoi les bouts ronds mangent l'espacement et deux arcs voisins se recouvrent.
 *
 * Pure, et marquée `'worklet'` : l'anneau statique l'appelle depuis le rendu React d'`Arc`,
 * l'anneau animé depuis un `useAnimatedProps` sur le thread UI (#70) — `from` fixe, `to`
 * interpolé par la valeur partagée qui fait grandir l'arc de rien jusqu'à sa part. Les deux
 * appelants partagent la même formule au lieu d'en tenir deux copies qui divergeraient au
 * premier ajustement.
 */
export function arcStroke(from: number, to: number, radius: number, strokeWidth: number): ArcStroke {
  'worklet';
  const circumference = 2 * Math.PI * radius;
  const gap = ring.gap;
  const length = Math.max(0, (to - from) * circumference - gap - strokeWidth);
  const offset = -(from * circumference + gap / 2 + strokeWidth / 2);

  return { circumference, length, offset };
}

/**
 * Les deux calques d'un arc (net et halo) lisent cette présentation unique. Elle garantit
 * qu'un arc encore absent — notamment au premier frame — n'émet aucun point sous un cap rond.
 */
export function arcPresentation(from: number, to: number, radius: number, strokeWidth: number): ArcPresentation {
  'worklet';
  const { circumference, length, offset } = arcStroke(from, to, radius, strokeWidth);

  return {
    strokeDasharray: `${length} ${circumference - length}`,
    strokeDashoffset: offset,
    strokeLinecap: length <= 0 ? 'butt' : 'round',
  };
}
