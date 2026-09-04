import { motion } from '@/design/tokens';

/**
 * La géométrie du cadran — les deux calques que `orbit` et `sweep` posent autour et derrière les
 * arcs du cercle de vie (#159), sans jamais toucher à leur rayon, à leur dash ni à leur offset.
 *
 * Pure et sans React, comme `attributeArcs.ts` dont elle est le pendant décoratif : elle se
 * prouve sur ses cas limites dans `ringMotion.test.ts` sans monter `AttributeRing`.
 *
 * ————— Pourquoi les deux tournent par `strokeDashoffset` —————————————————————————————————
 *
 * Ni la couronne ni le secteur ne portent une rotation : ils font **avancer leur décalage de
 * tirets**. C'est un nombre, exactement ce que `GrowingArc` anime déjà par `useAnimatedProps`,
 * là où une chaîne `rotate(…)` sur un `<G>` serait le seul point de ce lot dont le support
 * Reanimated × `react-native-svg` ne soit pas déjà prouvé dans ce dépôt.
 *
 * L'œil ne fait pas la différence : un pointillé qui dérive de sa circonférence en un cycle
 * parcourt la même distance au même rythme qu'une couronne qui ferait un tour.
 *
 * Le signe porte le sens : un décalage **croissant** recule le motif le long du tracé — donc
 * anti-horaire — et un décalage décroissant l'avance. La couronne prend le premier, le secteur
 * le second, et ce sont ces deux sens opposés qui font lire un mécanisme plutôt qu'une image
 * qui tourne.
 */

/**
 * De combien la couronne fait déborder le viewport SVG, mesuré comme le débord d'un halo :
 * depuis le bord extérieur du trait net.
 *
 * `ringGeometry` s'en sert exactement comme de `haloSpread` — le centre se décale de la moitié
 * du débord, et les arcs gardent leur rayon. Jamais négatif : une couronne posée à l'intérieur
 * du trait ne rétrécirait pas le viewport, elle n'aurait simplement rien à réserver.
 */
export function orbitSpread(strokeWidth: number, inset: number): number {
  if (inset <= 0) {
    return 0;
  }

  return Math.max(0, (inset + motion.orbit.width / 2 - strokeWidth / 2) * 2);
}

export type SweepStep = {
  /** La longueur du sous-secteur, en unités de tracé. */
  length: number;
  /** Son décalage propre, avant que la phase ne l'avance. */
  offset: number;
  opacity: number;
};

export type SweepGeometry = {
  /**
   * Le rayon du **tracé**, au quart du diamètre voulu : un trait d'épaisseur `strokeWidth`
   * centré sur ce rayon couvre exactement de 0 au bord. C'est ce qui fait un secteur plein
   * avec un cercle, sans calculer les points d'un chemin.
   */
  radius: number;
  strokeWidth: number;
  circumference: number;
  steps: SweepStep[];
};

/**
 * Le secteur de balayage, approché par N sous-secteurs d'opacité croissante.
 *
 * Le dégradé conique du bord d'attaque — plein à l'avant, transparent à l'arrière — n'existe ni
 * en React Native ni en SVG. On l'approche en découpant l'angle en tranches égales, chacune un
 * cran plus opaque que la précédente **dans le sens de la marche** : la dernière tranche est
 * celle qui mène, et c'est elle qui porte l'opacité pleine.
 */
export function sweepGeometry(
  diameter: number,
  wedge: number,
  steps: number,
  opacity: number,
): SweepGeometry {
  const radius = diameter / 4;
  const strokeWidth = diameter / 2;
  const circumference = 2 * Math.PI * radius;
  const length = ((wedge / 360) * circumference) / steps;

  return {
    radius,
    strokeWidth,
    circumference,
    steps: Array.from({ length: steps }, (_, index) => ({
      length,
      // Le tracé avance dans le sens horaire : la tranche d'indice le plus élevé est donc la
      // plus en avant, et c'est elle qui mène.
      offset: -(index * length) || 0,
      opacity: (opacity * (index + 1)) / steps,
    })),
  };
}

/** Le rayon de la couronne : le rayon net, plus son écart. */
export function orbitRadius(radius: number, inset: number): number {
  return radius + inset;
}
