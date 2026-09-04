import { motion } from '@/design/tokens';

/**
 * La géométrie de `flow` — les deux couches en parallaxe qui circulent **dans** le remplissage
 * de la barre d'XP (#159).
 *
 * Pure et sans React, comme `attributeArcs.ts` et `ringMotion.ts` : ce sont des listes de
 * positions, et elles se prouvent dans Node sans monter la moindre barre.
 *
 * ————— Pourquoi des listes de vues et pas un motif ————————————————————————————————————————
 *
 * React Native n'a ni `repeating-linear-gradient`, ni `background-position` animable. La
 * référence obtient ses deux couches en décalant deux motifs de tailles différentes ; ici, ce
 * sont deux `Animated.View` **plus larges que le remplissage**, chacune translatée d'exactement
 * un pas de son motif par cycle, à l'intérieur d'une vue qui masque. Le reflet fait dix fois le
 * pas de la hachure : c'est ce rapport, et rien d'autre, qui fait la parallaxe.
 */

/**
 * Les positions d'un motif qui se répète tous les `pitch` sur `width`, un pas avant le bord
 * compris.
 *
 * Ce pas d'avance n'est pas une marge de sécurité : la couche se translate d'un pas complet par
 * cycle, et sans lui le bord gauche du remplissage se retrouverait nu pendant que le motif
 * s'éloigne, une fois par cycle.
 */
export function stripeOffsets(width: number, pitch: number): number[] {
  if (width <= 0 || pitch <= 0) {
    return [];
  }

  return Array.from({ length: Math.ceil(width / pitch) + 2 }, (_, index) => (index - 1) * pitch);
}

export type SheenBand = { left: number; width: number; opacity: number };

/**
 * Le reflet, approché par `steps` bandes d'opacité en triangle.
 *
 * La référence est un dégradé — transparent, puis blanc à mi-course, puis transparent — étalé
 * sur les **quatre dixièmes centraux** du motif ; le reste est vide, et c'est ce vide qui fait
 * lire un reflet plutôt qu'un rayage clair. Sans dégradé natif, on découpe cette portion en
 * bandes égales dont l'opacité suit le même triangle.
 *
 * Le découpage ne se voit pas : le reflet parcourt son pas entier — dix fois celui de la
 * hachure — à chaque cycle, et une marche d'un quart d'opacité sur une bande large de quelques
 * points passe sous l'œil bien avant d'être lisible.
 */
export function sheenBands(sheen: number, steps: number, peak: number): SheenBand[] {
  if (sheen <= 0 || steps <= 0) {
    return [];
  }

  const span = sheen * 0.4;
  const start = sheen * 0.3;
  const width = span / steps;

  return Array.from({ length: steps }, (_, index) => {
    // Le sommet tombe au milieu de la portion : la distance s'y mesure en demi-bandes pour que
    // deux bandes symétriques reçoivent exactement la même opacité, quel que soit `steps`.
    const centre = (index + 0.5) / steps;
    return {
      left: start + index * width,
      width,
      opacity: peak * (1 - Math.abs(centre - 0.5) * 2),
    };
  });
}

/** Les positions du reflet sur toute la largeur, une bande de triangle par répétition. */
export function sheenStripes(width: number): { offset: number; bands: SheenBand[] }[] {
  const bands = sheenBands(motion.flow.sheen, motion.flow.sheenSteps, motion.flow.sheenOpacity);
  return stripeOffsets(width, motion.flow.sheen).map((offset) => ({ offset, bands }));
}
