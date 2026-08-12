import type { components } from '@/api/schema';

export type RewardSummary = components['schemas']['RewardSummary'];
export type XpLine = components['schemas']['XpLine'];

/**
 * Le `RewardSummary` traduit en scénario jouable.
 *
 * **L'ordre des clés du payload est l'ordre de l'animation**, et cette fonction ne fait que
 * le rendre explicite : elle parcourt `session → xp.breakdown → level.reached →
 * titlesUnlocked → loot → streak → unlockableNodes`, dans cet ordre, sans jamais trier ni
 * réordonner. Un champ déplacé côté serveur déplace la mise en scène — c'est voulu.
 *
 * C'est une fonction **pure** : pas de React, pas de Reanimated, pas d'horloge. Elle se teste
 * sur les fixtures capturées sans monter le moindre composant, et c'est elle qui porte toute
 * la logique de mise en scène. Le composant, lui, ne fait qu'interpoler.
 */

/** Les durées de la mise en scène, en millisecondes. Mesurées au spike, pas choisies au doigt. */
export const BEATS = {
  /** La carte de séance se referme. */
  sessionClose: 420,
  /** Une ligne de breakdown apparaît ; les suivantes s'enchaînent à ce rythme. */
  xpLine: 260,
  /** La barre finit sa course après la dernière ligne. */
  xpSettle: 420,
  /** Un niveau bascule. */
  levelFlip: 620,
  /** Un titre tombe. */
  titleDrop: 700,
  /** Le temps de respirer avant que l'écran devienne interactif. */
  tail: 360,
} as const;

export type Beat =
  | { kind: 'session'; at: number; until: number }
  | { kind: 'xpLine'; at: number; until: number; index: number; line: XpLine; runningTotal: number }
  | { kind: 'level'; at: number; until: number; level: number; index: number }
  | { kind: 'title'; at: number; until: number; index: number }
  | { kind: 'rest'; at: number; until: number };

export type Timeline = {
  beats: Beat[];
  /** Durée totale, en ms. La valeur que le `skip` fait atteindre d'un coup. */
  duration: number;
  /** Remplissage de la barre au repos, avant la séance. Entre 0 et 1. */
  fillBefore: number;
  /** Remplissage de la barre au repos, après la séance. Entre 0 et 1. */
  fillAfter: number;
  /**
   * Le remplissage que la barre atteint au bout de la phase XP, avant tout basculement de
   * niveau. Vaut 1 quand un niveau est franchi : la barre bute en haut, s'y tient, puis
   * le niveau bascule. C'est le temps fort.
   */
  fillPeak: number;
  /** Somme cumulée du breakdown, ligne à ligne. Sert à animer le compteur d'XP. */
  cumulative: number[];
  /**
   * Le remplissage de la barre après chaque ligne du breakdown, entre 0 et 1. Même longueur
   * que `cumulative`. C'est ici, et pas dans le composant, parce que c'est de la mise en
   * scène — et que ça se teste sur les fixtures sans monter la moindre vue.
   */
  fills: number[];
};

/**
 * La largeur d'un palier, en XP : ce qui y est déjà acquis plus ce qu'il reste à faire.
 *
 * Un `xpToNext` à `null` signifie le niveau maximum — la barre est pleine et le reste.
 */
function spanOfLevel(xpInto: number, xpToNext: number | null): number | null {
  return xpToNext === null ? null : xpInto + xpToNext;
}

/**
 * Où en était la barre avant la séance.
 *
 * Le payload porte désormais le palier de **départ** (`xpIntoLevelBefore` /
 * `xpToNextLevelBefore`), donc c'est exact dans tous les cas, y compris quand un niveau est
 * franchi. Ça ne se redéduit pas de l'arrivée : dès que plusieurs niveaux tombent d'un coup,
 * le palier de départ n'a plus rien à voir avec celui d'arrivée.
 */
function fillBefore(level: RewardSummary['level']): number {
  const span = spanOfLevel(level.xpIntoLevelBefore, level.xpToNextLevelBefore);
  if (span === null || span === 0) {
    return 1;
  }

  return clamp01(level.xpIntoLevelBefore / span);
}

function fillAfter(level: RewardSummary['level']): number {
  const span = spanOfLevel(level.xpIntoLevel, level.xpToNextLevel);
  if (span === null || span === 0) {
    return 1;
  }

  return clamp01(level.xpIntoLevel / span);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function buildTimeline(summary: RewardSummary): Timeline {
  const beats: Beat[] = [];
  let cursor = 0;

  // `Omit` sur une union ne distribue pas : il ne garde que les clés communes, et « index »
  // ou « level » deviennent des propriétés inconnues. On distribue à la main.
  type BeatSpec = {
    [K in Beat['kind']]: Omit<Extract<Beat, { kind: K }>, 'at' | 'until'> & { duration: number };
  }[Beat['kind']];

  const push = (beat: BeatSpec): void => {
    const { duration, ...rest } = beat;
    beats.push({ ...rest, at: cursor, until: cursor + duration } as Beat);
    cursor += duration;
  };

  // 1. `session` — la séance se referme. Toujours joué : il y a toujours une séance.
  push({ kind: 'session', duration: BEATS.sessionClose });

  // 2. `xp.breakdown` — ligne à ligne, dans l'ordre du calcul. La barre suit le cumul.
  //    Une ligne négative (DIMINISHING, DAILY_CAP) fait reculer le cumul : c'est le cas
  //    `plat`, où la barre remonte puis redescend jusqu'à ne pas avoir bougé.
  const cumulative: number[] = [];
  let running = 0;
  summary.xp.breakdown.forEach((line, index) => {
    running += line.amount;
    cumulative.push(running);
    push({ kind: 'xpLine', duration: BEATS.xpLine, index, line, runningTotal: running });
  });

  if (summary.xp.breakdown.length > 0) {
    push({ kind: 'rest', duration: BEATS.xpSettle });
  }

  // 3. `level.reached` — un basculement par niveau franchi. Plusieurs d'un coup est un cas
  //    normal, pas l'exception : on les joue tous, l'un après l'autre.
  summary.level.reached.forEach((level, index) => {
    push({ kind: 'level', duration: BEATS.levelFlip, level, index });
  });

  // 4. `titlesUnlocked` — le titre tombe. Rare, donc il prend son temps.
  summary.titlesUnlocked.forEach((_, index) => {
    push({ kind: 'title', duration: BEATS.titleDrop, index });
  });

  // 5. `loot`, `streak`, `unlockableNodes` — présents et vides jusqu'aux Lots 6, 5 et 7.
  //    On les saute tant qu'ils le sont ; on ne les rend pas optionnels pour autant.

  push({ kind: 'rest', duration: BEATS.tail });

  const before = fillBefore(summary.level);
  const after = fillAfter(summary.level);
  // Un niveau franchi veut dire que la barre bute en haut avant de basculer. Sinon elle
  // s'arrête simplement là où elle finit.
  const peak = summary.level.reached.length > 0 ? 1 : after;

  return {
    beats,
    duration: cursor,
    fillBefore: before,
    fillAfter: after,
    fillPeak: peak,
    cumulative,
    fills: fillsAlong(summary.level, cumulative),
  };
}

/**
 * Où en est la barre après chaque ligne du breakdown.
 *
 * Toute la phase XP se joue dans le palier de **départ** : on part d'où le joueur était et
 * on avance en XP réelle. Un seul régime, parce que le payload donne enfin ce palier — plus
 * de normalisation sur l'XP accordée pour masquer ce qu'on ne savait pas.
 *
 * Deux conséquences, et ce sont les deux qu'on veut :
 *
 * - Une ligne négative fait *redescendre* la barre — c'est le cas `plat`, où elle grimpe sur
 *   le socle puis se fait reprendre par les rendements décroissants, et finit exactement là
 *   où elle avait commencé.
 * - Le `clamp` fait buter la barre en haut **au moment précis** où le cumul franchit le
 *   palier, et non à la dernière ligne par construction. Elle s'y tient jusqu'au
 *   basculement, qui la remet à zéro : c'est le temps fort, et il tombe au bon endroit.
 */
function fillsAlong(level: RewardSummary['level'], cumulative: number[]): number[] {
  const span = spanOfLevel(level.xpIntoLevelBefore, level.xpToNextLevelBefore);
  if (span === null || span === 0) {
    return cumulative.map(() => 1);
  }

  return cumulative.map((total) => clamp01((level.xpIntoLevelBefore + total) / span));
}
