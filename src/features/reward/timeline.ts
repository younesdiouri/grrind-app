import type { components } from '@/api/schema';

export type SyncSummary = components['schemas']['SyncSummary'];
export type SyncTotals = components['schemas']['SyncTotals'];
export type RewardSummary = components['schemas']['RewardSummary'];
export type XpLine = components['schemas']['XpLine'];
export type SkippedWorkout = SyncSummary['skipped'][number];

/**
 * Le `SyncSummary` traduit en **une seule** timeline continue.
 *
 * **L'ordre des clés du payload est l'ordre de l'animation**, à deux niveaux désormais :
 * d'abord entre les workouts — `imported` est chronologique, celui du crédit — puis à
 * l'intérieur de chacun, `session → xp.breakdown → level.reached → titlesUnlocked → loot →
 * streak → unlockableNodes`. Cette fonction ne fait que le rendre explicite : elle ne trie
 * jamais, elle ne réordonne jamais.
 *
 * **La continuité est offerte, pas calculée.** Chaque `RewardSummary` porte son palier de
 * départ (`xpIntoLevelBefore` / `xpToNextLevelBefore`), et celui du workout *i+1* est
 * exactement l'arrivée du workout *i*. La barre s'enchaîne donc d'un workout à l'autre sans
 * un seul recalcul côté client — c'est précisément ce que la décision serveur de servir le
 * palier de départ (grrind-back#79) achète, et elle vient de payer.
 *
 * C'est une fonction **pure** : pas de React, pas de Reanimated, pas d'horloge. Elle se teste
 * sur les fixtures capturées sans monter le moindre composant, et elle porte toute la mise en
 * scène — y compris les rampes d'interpolation, qui vivaient dans le composant tant qu'il n'y
 * avait qu'un workout à jouer. Le composant ne fait plus qu'interpoler.
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
  /** Ce que coûte un workout condensé, à ajouter au socle du condensé. */
  digestPerWorkout: 190,
  /** Le socle du condensé : le temps de lire « et 12 autres séances ». */
  digestBase: 900,
  /** Le plafond du condensé. Au-delà, on ajoute des secondes que personne ne regarde. */
  digestMax: 3200,
  /** La liste des séances écartées apparaît. */
  skipped: 520,
  /** Le temps de respirer avant que l'écran devienne interactif. */
  tail: 360,
} as const;

/**
 * Combien de workouts se jouent **en détail**.
 *
 * C'est la première des deux questions de mise en scène du ticket, et elle se tranche sur des
 * chiffres : un workout détaillé coûte entre deux et trois secondes. Vingt séances, c'est une
 * minute et demie d'animation qu'un utilisateur rentrant de vacances ne regardera pas — il
 * touchera l'écran avant la troisième.
 *
 * Trois, donc. Assez pour que l'enchaînement se voie et que la barre traverse un palier ou
 * deux sous les yeux du joueur ; assez peu pour que le reste tienne dans un condensé de
 * quelques secondes. Le serveur, lui, envoie tout : **rien n'est tronqué**, seulement mis en
 * scène différemment, et le total reste juste parce qu'il vient de `totals`.
 */
export const DETAILED_WORKOUTS = 3;

export type Beat =
  | { kind: 'session'; at: number; until: number; workout: number }
  | {
      kind: 'xpLine';
      at: number;
      until: number;
      workout: number;
      index: number;
      line: XpLine;
      runningTotal: number;
    }
  | { kind: 'level'; at: number; until: number; workout: number; level: number }
  | { kind: 'title'; at: number; until: number; workout: number; index: number }
  /** Les workouts au-delà du détail, roulés en une montée continue. */
  | { kind: 'digest'; at: number; until: number; from: number; count: number; levels: number[] }
  /** Ce qui n'a rien rapporté, nommé. Toujours en dernier : c'est une note, pas une célébration. */
  | { kind: 'skipped'; at: number; until: number }
  | { kind: 'rest'; at: number; until: number };

/** Une rampe d'interpolation : `input` sont des instants, `output` la valeur à cet instant. */
export type Ramp = { input: number[]; output: number[] };

export type Timeline = {
  beats: Beat[];
  /** Durée totale, en ms. La valeur que le saut fait atteindre d'un coup. */
  duration: number;
  /** Le remplissage de la barre d'XP, de bout en bout. Entre 0 et 1. */
  bar: Ramp;
  /** Le compteur d'XP, cumulé sur **toute** la synchronisation. */
  counter: Ramp;
  /**
   * L'état d'arrivée, celui que le saut atteint.
   *
   * `null` quand rien n'a été crédité — le serveur refuse d'écrire « niveau 0 → 0 » à un
   * joueur de niveau 12, et le client n'a pas à inventer ce qu'il n'a pas envoyé.
   */
  totals: SyncTotals | null;
  /**
   * La fenêtre pendant laquelle le détail d'un workout occupe l'écran.
   *
   * Les blocs sont **empilés et non enchaînés verticalement** : trois séances détaillées,
   * leur breakdown, leurs niveaux et leurs titres ne tiendraient pas sur un iPhone, et une
   * vue défilante se battrait avec le geste qui saute la séquence. Chacun paraît à son tour
   * au même endroit, ce qui donne aussi la bonne lecture — la barre en haut est continue,
   * le détail en dessous se renouvelle.
   *
   * C'est de la mise en scène, donc c'est ici et pas dans le composant : ça se vérifie sur
   * les fixtures sans monter la moindre vue.
   */
  segments: { workout: number; at: number; until: number }[];
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * La largeur d'un palier, en XP : ce qui y est déjà acquis plus ce qu'il reste à faire.
 *
 * Un `xpToNext` à `null` signifie le niveau maximum — la barre est pleine et le reste.
 */
function spanOf(xpInto: number, xpToNext: number | null): number | null {
  return xpToNext === null ? null : xpInto + xpToNext;
}

/** Où en était la barre avant ce workout. */
function fillBefore(level: RewardSummary['level']): number {
  const span = spanOf(level.xpIntoLevelBefore, level.xpToNextLevelBefore);
  return span === null || span === 0 ? 1 : clamp01(level.xpIntoLevelBefore / span);
}

/** Où elle est après. */
function fillAfter(level: RewardSummary['level']): number {
  const span = spanOf(level.xpIntoLevel, level.xpToNextLevel);
  return span === null || span === 0 ? 1 : clamp01(level.xpIntoLevel / span);
}

/**
 * Où en est la barre après chaque ligne du breakdown d'un workout.
 *
 * Toute la phase XP d'un workout se joue dans son palier de **départ** : on part d'où le
 * joueur était et on avance en XP réelle. Deux conséquences, et ce sont les deux qu'on veut :
 *
 * - Une ligne négative fait *redescendre* la barre — les rendements décroissants et le
 *   plafond quotidien se voient, au lieu d'être noyés dans un total.
 * - Le `clamp` fait buter la barre en haut **au moment précis** où le cumul franchit le
 *   palier, et non à la dernière ligne par construction. Elle s'y tient jusqu'au
 *   basculement, qui la remet à zéro : c'est le temps fort, et il tombe au bon endroit.
 */
function fillsAlong(level: RewardSummary['level'], cumulative: number[]): number[] {
  const span = spanOf(level.xpIntoLevelBefore, level.xpToNextLevelBefore);
  if (span === null || span === 0) {
    return cumulative.map(() => 1);
  }

  return cumulative.map((total) => clamp01((level.xpIntoLevelBefore + total) / span));
}

/**
 * Deux points d'interpolation ne peuvent pas partager le même instant : l'entrée doit croître
 * strictement, sinon `interpolate` rend n'importe quoi. Sur un doublon, c'est la **dernière**
 * valeur qui compte — un basculement de niveau pose volontairement deux points collés.
 */
function strictlyIncreasing(ramp: Ramp): Ramp {
  const input: number[] = [];
  const output: number[] = [];

  ramp.input.forEach((value, index) => {
    const previous = input[input.length - 1];
    if (previous === undefined || value > previous) {
      input.push(value);
      output.push(ramp.output[index]);
      return;
    }
    output[output.length - 1] = ramp.output[index];
  });

  return { input, output };
}

export function buildTimeline(summary: SyncSummary): Timeline {
  const beats: Beat[] = [];
  const bar: Ramp = { input: [], output: [] };
  const counter: Ramp = { input: [], output: [] };

  let cursor = 0;
  /** L'XP cumulée sur toute la synchronisation, tous workouts confondus. */
  let running = 0;

  type BeatSpec = {
    // `Omit` sur une union ne distribue pas : il ne garde que les clés communes, et « index »
    // ou « level » deviennent des propriétés inconnues. On distribue à la main.
    [K in Beat['kind']]: Omit<Extract<Beat, { kind: K }>, 'at' | 'until'> & { duration: number };
  }[Beat['kind']];

  const push = (beat: BeatSpec): { at: number; until: number } => {
    const { duration, ...rest } = beat;
    const span = { at: cursor, until: cursor + duration };
    beats.push({ ...rest, ...span } as Beat);
    cursor += duration;
    return span;
  };

  const holdBar = (at: number, fill: number): void => {
    bar.input.push(at);
    bar.output.push(fill);
  };

  const holdCounter = (at: number, value: number): void => {
    counter.input.push(at);
    counter.output.push(value);
  };

  const detailed = summary.imported.slice(0, DETAILED_WORKOUTS);
  const condensed = summary.imported.slice(DETAILED_WORKOUTS);
  const last = summary.imported[summary.imported.length - 1];

  // Le point de départ : là où le joueur était avant le tout premier workout crédité. Sans
  // workout crédité, il n'y a pas de barre à animer — `tout-ecarte` passe directement à la
  // liste des écarts.
  const start = summary.imported.length > 0 ? fillBefore(summary.imported[0].level) : 0;
  holdBar(0, start);
  holdCounter(0, 0);

  detailed.forEach((workout, index) => {
    // 1. `session` — la séance se referme. La barre attend, posée sur son palier de départ.
    const session = push({ kind: 'session', duration: BEATS.sessionClose, workout: index });
    holdBar(session.at, fillBefore(workout.level));
    holdBar(session.until, fillBefore(workout.level));

    // 2. `xp.breakdown` — ligne à ligne, dans l'ordre du calcul. La barre suit le cumul, le
    //    compteur suit le total de la **synchronisation** et non celui du workout : c'est une
    //    seule course, pas trois compteurs remis à zéro.
    // Le cumul se calcule d'abord, en entier : la position de la barre après une ligne dépend
    // du palier de départ du workout, pas de ce qui s'est passé avant lui.
    const within: number[] = [];
    let sum = 0;
    workout.xp.breakdown.forEach((line) => {
      sum += line.amount;
      within.push(sum);
    });
    const fills = fillsAlong(workout.level, within);

    workout.xp.breakdown.forEach((line, position) => {
      running += line.amount;

      const span = push({
        kind: 'xpLine',
        duration: BEATS.xpLine,
        workout: index,
        index: position,
        line,
        runningTotal: running,
      });
      holdCounter(span.until, running);
      holdBar(span.until, fills[position]);
    });

    if (workout.xp.breakdown.length > 0) {
      const settle = push({ kind: 'rest', duration: BEATS.xpSettle });
      // Un niveau franchi veut dire que la barre bute en haut avant de basculer. Sinon elle
      // s'arrête simplement là où elle finit.
      holdBar(settle.until, workout.level.reached.length > 0 ? 1 : fillAfter(workout.level));
    }

    // 3. `level.reached` — un basculement par niveau franchi. Plusieurs d'un coup est un cas
    //    normal, pas l'exception : on les joue tous, l'un après l'autre. La barre retombe à
    //    zéro et repart — ce dent-de-scie *est* la mise en scène du level up.
    workout.level.reached.forEach((level, position) => {
      const span = push({ kind: 'level', duration: BEATS.levelFlip, workout: index, level });
      const isLast = position === workout.level.reached.length - 1;
      holdBar(span.at + 1, 0);
      holdBar(span.until, isLast ? fillAfter(workout.level) : 1);
    });

    // 4. `titlesUnlocked` — le titre tombe. Rare, donc il prend son temps.
    workout.titlesUnlocked.forEach((_, position) => {
      push({ kind: 'title', duration: BEATS.titleDrop, workout: index, index: position });
    });

    // 5. `loot`, `streak`, `unlockableNodes` — présents et vides jusqu'aux Lots 6, 5 et 7.
    //    On les saute tant qu'ils le sont ; on ne les rend pas optionnels pour autant.
  });

  // Le condensé : tout ce que le détail n'a pas joué, en une montée continue.
  if (condensed.length > 0) {
    const levels = condensed.flatMap((workout) => workout.level.reached);
    const span = push({
      kind: 'digest',
      duration: Math.min(
        BEATS.digestMax,
        BEATS.digestBase + condensed.length * BEATS.digestPerWorkout,
      ),
      from: DETAILED_WORKOUTS,
      count: condensed.length,
      levels,
    });

    // La barre garde son dent-de-scie : un aller de 0 à 1 par niveau franchi dans le
    // condensé, puis la fraction finale. Lisser tout en une seule montée effacerait
    // précisément ce que le joueur est venu voir — et c'est souvent là que les niveaux
    // tombent, puisque c'est la plus grosse part de l'XP du lot.
    const legs = levels.length + 1;
    const step = (span.until - span.at) / legs;
    levels.forEach((_, index) => {
      const end = span.at + step * (index + 1);
      holdBar(end, 1);
      holdBar(end + 1, 0);
    });
    holdBar(span.until, last === undefined ? 0 : fillAfter(last.level));

    // Le compteur, lui, va tout droit jusqu'au total : c'est la valeur que le joueur
    // retiendra, et elle vient de `totals`, pas d'une somme refaite ici.
    holdCounter(span.until, summary.totals?.xpAwarded ?? running);
    running = summary.totals?.xpAwarded ?? running;
  }

  // Ce qui n'a rien rapporté, nommé — et **en dernier**. Un écart est une note en bas de page,
  // pas une célébration : le faire passer avant l'XP ferait commencer l'écran par un refus.
  if (summary.skipped.length > 0) {
    push({ kind: 'skipped', duration: BEATS.skipped });
  }

  const tail = push({ kind: 'rest', duration: BEATS.tail });
  holdBar(tail.until, last === undefined ? start : fillAfter(last.level));
  holdCounter(tail.until, summary.totals?.xpAwarded ?? running);

  // Un segment court de l'ouverture d'une séance à l'ouverture de la suivante ; le dernier
  // s'arrête là où le détail cède la place — au condensé, aux écarts, ou à la fin.
  const openings = beats.filter((beat) => beat.kind === 'session');
  const afterDetail =
    beats.find((beat) => beat.kind === 'digest' || beat.kind === 'skipped')?.at ?? cursor;

  const segments = openings.map((opening, index) => ({
    workout: opening.workout,
    at: opening.at,
    until: openings[index + 1]?.at ?? afterDetail,
  }));

  return {
    beats,
    duration: cursor,
    bar: strictlyIncreasing(bar),
    counter: strictlyIncreasing(counter),
    totals: summary.totals ?? null,
    segments,
  };
}
