import { ambient } from './tokens.ts';

/**
 * La lecture d'un sous-cycle sur l'horloge partagée.
 *
 * `AmbientBackdropProvider` fait tourner **une** valeur de 0 à 1 sur `ambient.cycle`, sur le
 * thread UI. Tout ce qui bouge en continu dans l'app s'y branche par une phase et un modulo
 * plutôt que par son propre `withRepeat` : le coût de dix animations devient celui d'une seule,
 * et elles restent en phase entre elles pour toujours — ce que dix horloges indépendantes ne
 * garantissent pas, puisqu'elles ne démarrent pas au même frame.
 *
 * `'worklet'` comme `arcStroke` : ces fonctions ne sont appelées que depuis un `useAnimatedStyle`
 * ou un `useAnimatedProps`, donc sur le thread UI. Elles restent pures et se prouvent dans Node
 * sans monter le moindre composant.
 */

/**
 * La progression dans un sous-cycle, entre 0 (inclus) et 1 (exclu).
 *
 * `offset` est un décalage **en millisecondes**, positif ou négatif : c'est ce qui déphase deux
 * panneaux voisins, ou les deux segments d'un même cadre. Le modulo de JavaScript garde le signe
 * du dividende, d'où la remise dans `[0, 1[` — sans elle, un décalage négatif rendrait une phase
 * négative et l'interpolation partirait à l'envers.
 */
export function cyclePhase(clock: number, cycle: number, offset = 0): number {
  'worklet';
  const phase = ((clock * ambient.cycle + offset) % cycle) / cycle;
  return phase < 0 ? phase + 1 : phase;
}

/**
 * Le décalage du `index`-ième élément d'une cascade, en millisecondes.
 *
 * Négatif : le premier élément est en tête et les suivants le suivent, plutôt que de l'attendre.
 * C'est l'`animation-delay` négatif de la référence, qui démarre une animation déjà commencée.
 */
export function staggerOffset(index: number, stagger: number): number {
  'worklet';
  // `|| 0` sur le premier : `-0 * stagger` vaut `-0`, qui n'est pas `0` pour `Object.is` et
  // se propagerait tel quel dans une transformation.
  return -index * stagger || 0;
}

/**
 * Une respiration : `from` au début et à la fin du cycle, `to` au milieu.
 *
 * Un cosinus plutôt qu'une rampe à trois points, parce que c'est exactement l'`ease-in-out` de
 * la référence — accélération et décélération symétriques, sans le coude qu'une interpolation
 * linéaire laisserait au sommet. Une respiration qui a un coude ne respire pas, elle bat.
 */
export function breathe(phase: number, from: number, to: number): number {
  'worklet';
  return from + ((to - from) * (1 - Math.cos(phase * 2 * Math.PI))) / 2;
}

/**
 * Un cycle continu peut-il se lire sur l'horloge partagée sans saut ?
 *
 * Un cycle qui ne divise pas `ambient.cycle` ne finit pas son dernier tour quand l'horloge
 * revient à zéro : il saute, une fois toutes les douze secondes, sur tous les écrans en même
 * temps. C'est le seul défaut de ce lot qui ne se voit pas en le regardant dix secondes.
 */
export function loopsCleanly(cycle: number): boolean {
  return cycle > 0 && ambient.cycle % cycle === 0;
}
