import type { components } from '@/api/schema';
import { ATTRIBUTE_ORDER } from '@/components/attributeArcs';
import { duration, type AttributeState } from '@/design/tokens';

export type SyncSummary = components['schemas']['SyncSummary'];
export type SyncTotals = components['schemas']['SyncTotals'];
export type RewardSummary = components['schemas']['RewardSummary'];
export type XpLine = components['schemas']['XpLine'];
export type DroppedItem = components['schemas']['DroppedItem'];
export type SkippedWorkout = SyncSummary['skipped'][number];
/** Pourquoi une séance créditée n'a rien rapporté. `null` pour tout crédit normal. */
export type XpNoCreditReason = NonNullable<RewardSummary['xp']['reason']>;

/** Le halo vert suit le total XP que le compteur affiche, jamais le seul fait d'un import. */
export function hasAwardedXp(totals: SyncTotals | null): boolean {
  return totals !== null && totals.xpAwarded > 0;
}

/**
 * Le `SyncSummary` traduit en **une seule** timeline continue.
 *
 * **L'ordre des clés du payload est l'ordre de l'animation**, à deux niveaux désormais :
 * d'abord entre les workouts — `imported` est chronologique, celui du crédit — puis à
 * l'intérieur de chacun, `session → xp.breakdown → attributes → level.reached →
 * titlesUnlocked → loot → coins → streak → unlockableNodes`. Cette fonction ne fait que le
 * rendre explicite : elle ne trie jamais, elle ne réordonne jamais.
 *
 * **`loot` puis `coins`, et rien entre les deux** (#226) : l'objet se révèle, la bourse
 * l'encaisse. La bourse court de son `before` à son `after` — jamais de zéro à `gained` —
 * exactement comme le palier de niveau ; `gained` ne sert qu'à décider s'il y a quelque chose
 * à jouer. Un tirage bredouille et une bourse à gain nul ne consomment aucun temps, la même
 * règle que les jauges à zéro (#80) : une séance sur deux ne fait rien tomber, et lui donner
 * un temps d'écran vide dirait « il ne s'est rien passé » à quelqu'un qui vient de s'entraîner.
 *
 * **La continuité est offerte, pas calculée.** Chaque `RewardSummary` porte son palier de
 * départ (`xpIntoLevelBefore` / `xpToNextLevelBefore`), et celui du workout *i+1* est
 * exactement l'arrivée du workout *i*. La barre s'enchaîne donc d'un workout à l'autre sans
 * un seul recalcul côté client — c'est précisément ce que la décision serveur de servir le
 * palier de départ (grrind-back#79) achète, et elle vient de payer.
 *
 * **Et elle se referme sur un bilan** (#79). Le battement `recap` est le seul qui ne se termine
 * pas : il court jusqu'à `duration` et y reste. Tous les autres blocs sont écrits pour être
 * chassés — c'est juste pendant la séquence, ça ne l'est plus à la fin, où l'écran se
 * retrouvait nu. Le rythme y gagne au passage un temps de lecture explicite (`BEATS.dwell`)
 * après chaque bloc complet : ils se construisaient puis sortaient aussitôt.
 *
 * C'est une fonction **pure** : pas de React, pas de Reanimated, pas d'horloge. Elle se teste
 * sur les fixtures capturées sans monter le moindre composant, et elle porte toute la mise en
 * scène — y compris les rampes d'interpolation, qui vivaient dans le composant tant qu'il n'y
 * avait qu'un workout à jouer. Le composant ne fait plus qu'interpoler.
 */

/**
 * Les temps de la mise en scène, en millisecondes.
 *
 * **Ce ne sont pas des durées neuves.** Elles viennent de l'échelle du design system, mesurée
 * au spike (#4) sur un iPhone physique : une carte qui se pose met le même temps ici que
 * partout ailleurs. Ce qui est propre à cet écran, c'est le *choix* — quel temps pour quel
 * moment — et c'est bien ce que ce fichier décide.
 *
 * Le budget du condensé, lui, reste ici et en clair : il ne décrit pas un geste mais une
 * quantité à écouler, et il se calcule sur la taille du lot. Ce n'est pas une valeur de
 * design, c'est une règle de rythme.
 */
export const BEATS = {
  /** La carte de séance se referme. */
  sessionClose: duration.settle,
  /** Une ligne de breakdown apparaît ; les suivantes s'enchaînent à ce rythme. */
  xpLine: duration.line,
  /** La raison paraît, à la place du calcul qui n'a pas eu lieu. Elle prend le temps d'une
   *  ligne **et** de la course que la barre n'a pas faite : c'est une phrase à lire, pas un
   *  chiffre à voir passer. */
  noCredit: duration.line + duration.settle,
  /** La barre finit sa course après la dernière ligne. */
  xpSettle: duration.settle,
  /** Un gain de caractéristique atterrit ; les suivants s'enchaînent au même rythme qu'une
   *  ligne de breakdown — c'est la même échelle, pas une nouvelle. */
  attributeGain: duration.line,
  /** L'anneau finit sa course une fois les quatre gains posés. Vitality, dérivée, ne bouge
   *  qu'ici : elle est la conséquence de la redistribution, pas un cinquième gain. */
  attributeSettle: duration.settle,
  /** Un niveau bascule. */
  levelFlip: duration.flip,
  /** Un titre tombe. */
  titleDrop: duration.drop,
  /** Un objet tombe. Même échelle que `titleDrop`, et pour la même raison (#226) : un objet
   *  est rare, il mérite le temps d'un titre — pas un temps neuf inventé pour l'occasion. */
  lootDrop: duration.drop,
  /** La bourse finit sa course, de `before` à `after` — même échelle qu'un palier ou qu'une
   *  jauge qui se pose. */
  coinsSettle: duration.settle,
  /** Ce que coûte un workout condensé, à ajouter au socle du condensé. */
  digestPerWorkout: 190,
  /** Le socle du condensé : le temps de lire « et 12 autres séances ». */
  digestBase: 900,
  /** Le plafond du condensé. Au-delà, on ajoute des secondes que personne ne regarde. */
  digestMax: 3200,
  /** La liste des séances écartées apparaît. */
  skipped: duration.unfold,
  /**
   * Le temps de lire un bloc **complet**, avant que le suivant ne le chasse.
   *
   * C'est ce qui manquait, et c'est la moitié du défaut du #79. Chaque bloc avait le temps
   * de *se construire* — une ligne toutes les `line`, la barre qui suit — puis il sortait
   * aussitôt sa dernière ligne posée. Un breakdown de trois lignes tenait un peu plus d'une
   * seconde en tout : le temps de comprendre, c'était déjà parti.
   *
   * `breath` — « le temps de respirer » — et pas une valeur neuve. Le *rythme* est une
   * décision de ce fichier, l'*échelle* appartient aux tokens : élargir `line` ou `settle`
   * là-bas ralentirait chaque liste de l'app pour régler un problème de cet écran-ci.
   *
   * Il se paie trois fois par séance détaillée — après le breakdown, dans le battement des
   * jauges, après le palier — et une quatrième quand du loot tombe (#226), après ce dernier.
   * Soit un peu plus d'une seconde à chaque fois. C'est ce qui fait passer une séance de trois
   * secondes à quatre et demie environ, et quinze séances de quinze secondes à dix-neuf — plus
   * jusqu'à deux secondes par séance détaillée où du loot ou des pièces tombent. Au-delà, on
   * dépasse le budget que `timeline.test.ts` garde sur le condensé, et on ajoute des secondes
   * que personne ne regarde.
   */
  dwell: duration.breath,
  /**
   * Le bilan tient l'écran avant que l'affordance de sortie ne paraisse.
   *
   * En clair, comme le budget du condensé et pour la même raison : ce n'est pas un geste
   * qu'on cale sur l'échelle du design system, c'est un **temps de lecture** — combien de
   * secondes il faut pour prendre un total, deux niveaux, cinq jauges et deux comptes.
   */
  recap: 2000,
  /** Le temps de respirer avant que l'écran devienne interactif, quand il n'y a pas de bilan
   *  à lire — rien n'a été crédité, il n'y a rien à récapituler. */
  tail: duration.breath,
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
  /**
   * Le calcul n'a pas eu lieu — et le dire prend la place qu'il aurait prise.
   *
   * La marche est créditée sans rapporter d'XP (`grrind-back#167`) : `breakdown` est vide,
   * `awarded` vaut zéro, et `xp.reason` porte l'explication. Sans ce battement, la carte de
   * séance se retrouvait seule face au vide pendant que le compteur affichait `+0` — ce qui
   * se lit comme une panne, pas comme une règle.
   */
  | { kind: 'noCredit'; at: number; until: number; workout: number; reason: XpNoCreditReason }
  /** Les cinq jauges montent — entre le repos qui suit le breakdown et le premier `level`. */
  | { kind: 'attributes'; at: number; until: number; workout: number }
  | { kind: 'level'; at: number; until: number; workout: number; level: number }
  | { kind: 'title'; at: number; until: number; workout: number; index: number }
  /**
   * Un objet tombe (#226). `index` pointe dans `workout.loot`, comme `title` pointe dans
   * `titlesUnlocked` — la donnée elle-même reste dans le payload, la timeline ne fait que
   * dater. Un seul jet aujourd'hui (voir le docblock du `LootRoller` côté back), mais le
   * contrat rend un tableau : on anime le tableau, pas le « un ».
   */
  | { kind: 'loot'; at: number; until: number; workout: number; index: number }
  /**
   * La bourse encaisse ce que le loot vient de révéler — juste après lui, jamais avant
   * (#226). `before`/`after` sont ceux du contrat, jamais recalculés : `gained` ne sert qu'à
   * décider s'il y a quelque chose à jouer.
   */
  | { kind: 'coins'; at: number; until: number; workout: number; gained: number; before: number; after: number }
  /** Les workouts au-delà du détail, roulés en une montée continue. */
  | { kind: 'digest'; at: number; until: number; from: number; count: number; levels: number[] }
  /** Ce qui n'a rien rapporté, nommé. Toujours en dernier : c'est une note, pas une célébration. */
  | { kind: 'skipped'; at: number; until: number }
  /**
   * L'état d'arrivée — **le seul battement qui ne se referme pas**.
   *
   * Tous les autres blocs sont écrits pour être chassés : c'est la règle « rien ne cohabite »,
   * et elle est juste *pendant* la séquence. Mais personne ne reprenait la main à la fin, et
   * l'écran se retrouvait nu au moment précis où le joueur venait chercher ce qu'il avait
   * gagné (#79). Celui-ci court jusqu'à `duration` et y reste.
   *
   * Il n'existe pas quand `totals` vaut `null` : il n'y a pas d'état d'arrivée quand rien
   * n'est arrivé, et le client n'invente pas ce zéro.
   */
  | { kind: 'recap'; at: number; until: number }
  | { kind: 'rest'; at: number; until: number };

/** Une rampe d'interpolation : `input` sont des instants, `output` la valeur à cet instant. */
export type Ramp = { input: number[]; output: number[] };

/**
 * Les cinq jauges de caractéristiques, chacune sa propre rampe de valeur **absolue** — jamais
 * une fraction déjà calculée. Le cercle en tire ses parts lui-même, dans le worklet qui
 * l'anime (`arcsOf`, désormais marquée `'worklet'` pour ça) : les figer en fractions ici
 * rendrait impossible d'afficher le chiffre que chaque caractéristique porte, et Vitality n'a
 * même pas de part à figer, seulement un nombre.
 */
export type AttributeRamps = Record<AttributeState, Ramp>;

export type Timeline = {
  beats: Beat[];
  /** Durée totale, en ms. La valeur que le saut fait atteindre d'un coup. */
  duration: number;
  /** Le remplissage de la barre d'XP, de bout en bout. Entre 0 et 1. */
  bar: Ramp;
  /** Le compteur d'XP, cumulé sur **toute** la synchronisation. */
  counter: Ramp;
  /**
   * La bourse, de bout en bout — même geste que `counter`, jamais une somme refaite ici.
   *
   * Elle tient plate tant qu'aucune séance ne fait tomber de pièces, court de `before` à
   * `after` pendant le battement `coins` de chaque workout, et continue sous le condensé
   * exactement comme `attributes` : la montée y est continue, sans dent-de-scie, parce que la
   * bourse n'a rien d'un palier qui butte et retombe.
   */
  purse: Ramp;
  /**
   * Les cinq jauges de caractéristiques, de bout en bout — condensé compris, comme `bar` et
   * `counter`. Le condensé ne montre pas de cercle, mais les rampes continuent d'y courir
   * pour que l'arrivée du dernier `imported` soit exacte quand le joueur saute.
   */
  attributes: AttributeRamps;
  /**
   * L'or de la butée : 1 à l'instant précis où la barre bute en haut, 0 partout ailleurs.
   *
   * C'est le temps fort de la séquence, et il ne se déduit pas de la barre : `bar` vaut aussi
   * 1 pendant tout le palier d'attente qui précède un basculement, et allumer l'or sur cette
   * durée-là en ferait un état plutôt qu'un éclat. La crête dit **le moment**, pas la valeur.
   *
   * Elle couvre les niveaux du condensé comme ceux du détail : la barre y bute autant, et
   * c'est même là que le plus gros du lot tombe. Quand deux franchissements se suivent de si
   * près que leurs éclats se chevauchent — un condensé très fourni — ils se fondent en une
   * seule lueur continue, ce qui est la bonne lecture de ce qui se passe.
   */
  crest: Ramp;
  /**
   * Les instants où un niveau est franchi, détail et condensé confondus.
   *
   * L'écran s'en sert pour l'haptique. Ils sont ici parce qu'ils sont déjà connus ici : les
   * recalculer côté composant, c'est refaire la trigonométrie du condensé à un deuxième
   * endroit et la voir diverger au premier ajustement.
   */
  crossings: number[];
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

/** Les cinq jauges à zéro — le point de départ d'un compte neuf, sans workout crédité. */
const zeroAttributes: Record<AttributeState, number> = {
  strength: 0,
  endurance: 0,
  mobility: 0,
  dexterity: 0,
  vitality: 0,
};

/** L'instantané d'une jauge de caractéristiques — son avant, ou son après. */
function attributesAt(
  gauges: RewardSummary['attributes'],
  edge: 'before' | 'after',
): Record<AttributeState, number> {
  return {
    strength: gauges.strength[edge],
    endurance: gauges.endurance[edge],
    mobility: gauges.mobility[edge],
    dexterity: gauges.dexterity[edge],
    vitality: gauges.vitality[edge],
  };
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
  const purse: Ramp = { input: [], output: [] };
  const attributes: AttributeRamps = {
    strength: { input: [], output: [] },
    endurance: { input: [], output: [] },
    mobility: { input: [], output: [] },
    dexterity: { input: [], output: [] },
    vitality: { input: [], output: [] },
  };

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

  const holdPurse = (at: number, value: number): void => {
    purse.input.push(at);
    purse.output.push(value);
  };

  /**
   * Verrouille les cinq jauges sur une valeur, à un instant donné — la même technique que
   * `holdBar`, répétée cinq fois. Sans ce point, une jauge qui n'a encore rien à montrer
   * dériverait dès la première image au lieu de rester plate jusqu'à son tour.
   */
  const holdAttributes = (at: number, values: Record<AttributeState, number>): void => {
    ATTRIBUTE_ORDER.forEach((attribute) => {
      attributes[attribute].input.push(at);
      attributes[attribute].output.push(values[attribute]);
    });
    attributes.vitality.input.push(at);
    attributes.vitality.output.push(values.vitality);
  };

  /** Les instants de franchissement, dans l'ordre où ils se jouent. */
  const crossings: number[] = [];

  const detailed = summary.imported.slice(0, DETAILED_WORKOUTS);
  const condensed = summary.imported.slice(DETAILED_WORKOUTS);
  const last = summary.imported[summary.imported.length - 1];

  // Le point de départ : là où le joueur était avant le tout premier workout crédité. Sans
  // workout crédité, il n'y a pas de barre à animer — `tout-ecarte` passe directement à la
  // liste des écarts.
  const start = summary.imported.length > 0 ? fillBefore(summary.imported[0].level) : 0;
  /** Le solde avant le tout premier workout crédité — le `before` que le bilan reprendra. */
  const purseStart = summary.imported.length > 0 ? summary.imported[0].coins.before : 0;
  holdBar(0, start);
  holdCounter(0, 0);
  holdPurse(0, purseStart);
  holdAttributes(
    0,
    summary.imported.length > 0 ? attributesAt(summary.imported[0].attributes, 'before') : zeroAttributes,
  );

  // L'anticipation : un temps mort **avant** la première séance, où la barre est posée sur le
  // palier du joueur et où rien ne bouge encore. C'est ce qui fait de la première ligne un
  // événement plutôt qu'un début — on ne peut pas gagner quelque chose sans avoir d'abord vu
  // ce qu'on avait. Elle ne se joue que s'il y a quelque chose à jouer : une synchronisation
  // qui n'a rien crédité n'a rien à faire attendre.
  if (summary.imported.length > 0) {
    const anticipation = push({ kind: 'rest', duration: duration.breath });
    holdBar(anticipation.until, start);
    holdPurse(anticipation.until, purseStart);
  }

  detailed.forEach((workout, index) => {
    // 1. `session` — la séance se referme. La barre attend, posée sur son palier de départ.
    const session = push({ kind: 'session', duration: BEATS.sessionClose, workout: index });
    holdBar(session.at, fillBefore(workout.level));
    holdBar(session.until, fillBefore(workout.level));
    // La bourse aussi se tient posée sur ce qu'elle valait avant cette séance — même geste
    // que la barre, et pour la même raison : sans cette ancre, elle dériverait vers le
    // prochain gain avant même que la séance en cours n'ait tombé le sien.
    holdPurse(session.at, workout.coins.before);
    holdPurse(session.until, workout.coins.before);

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

      // Puis le temps de **lire** ce qui vient de se poser (#79). Le bloc de détail sort à
      // l'ouverture du battement des jauges — c'est écrit dans `WorkoutDetail` — donc reculer
      // celui-ci est ce qui laisse le breakdown à l'écran, entier, avant qu'on le chasse.
      const read = push({ kind: 'rest', duration: BEATS.dwell });
      holdBar(read.until, workout.level.reached.length > 0 ? 1 : fillAfter(workout.level));
    }

    // 2bis. …ou la raison, quand il n'y a pas eu de calcul (#80). Le client ne **déduit** rien
    //       d'un breakdown vide et ne teste jamais la discipline : il lit `xp.reason`, que le
    //       serveur envoie exactement pour ça. Le jour où une deuxième discipline rejoint la
    //       marche, il n'y a rien à changer ici.
    if (workout.xp.reason !== null && workout.xp.reason !== undefined) {
      const reason = push({
        kind: 'noCredit',
        duration: BEATS.noCredit,
        workout: index,
        reason: workout.xp.reason,
      });
      // La barre ne bouge pas — c'est le sujet. La tenir explicitement l'empêche de dériver
      // vers le point suivant au lieu de rester posée là où le joueur était.
      holdBar(reason.at, fillBefore(workout.level));
      holdBar(reason.until, fillAfter(workout.level));

      const read = push({ kind: 'rest', duration: BEATS.dwell });
      holdBar(read.until, fillAfter(workout.level));
    }

    // 2.5. `attributes` — les quatre gains, dans l'ordre du contrat, puis Vitality. Un gain
    //      à zéro ne consomme aucun temps : il n'y a rien à annoncer, il reste éteint dans la
    //      légende sans jamais bouger. Vitality, dérivée, ne se pose qu'une fois les quatre
    //      autres arrivées — c'est elle qui referme le battement, sur `attributeSettle`.
    const before = attributesAt(workout.attributes, 'before');
    const after = attributesAt(workout.attributes, 'after');
    const landings = ATTRIBUTE_ORDER.filter((attribute) => workout.attributes[attribute].gained > 0);

    // Une séance qui ne rapporte rien ne redistribue rien : **pas d'anneau du tout** (#80).
    // Le montrer immobile pendant deux secondes ferait croire à une animation qui a raté, et
    // ce serait la deuxième fois de suite qu'on dirait « il ne s'est rien passé » à quelqu'un
    // qui vient de marcher une heure. La raison qui précède a déjà tout dit.
    //
    // Un `if` et non un `return` : ce qui suit — paliers et titres — n'a rien à voir avec les
    // jauges, et les sauter au même endroit créerait une dépendance silencieuse entre deux
    // décisions indépendantes. Ils sont vides ici, c'est tout.
    if (landings.length > 0 || (workout.xp.reason === null || workout.xp.reason === undefined)) {
      // La visibilité des jauges est calée sur **ce battement** (`AttributeStage` interpole son
      // opacité entre `at` et `until`), pas sur ce qui le suit : leur temps de lecture est donc
      // dans sa durée, et pas dans un repos posé après.
      const attributesBeat = push({
        kind: 'attributes',
        duration: landings.length * BEATS.attributeGain + BEATS.attributeSettle + BEATS.dwell,
        workout: index,
      });

      // Le départ : verrouillé sur ce que le joueur avait, pour que rien ne bouge avant le tour
      // de la caractéristique — même si la continuité du contrat le garantit déjà, ce point
      // fixe le début du battement plutôt que de dépendre d'un hasard de calendrier.
      holdAttributes(attributesBeat.at, before);

      // Chaque gain non nul atterrit à son tour. Ceux qui attendent encore restent tenus sur
      // leur valeur de départ à chaque palier — sinon `interpolate` les ferait dériver dès la
      // première image, au lieu de les laisser immobiles jusqu'à leur tour.
      let landed = before;
      landings.forEach((attribute, position) => {
        const at = attributesBeat.at + (position + 1) * BEATS.attributeGain;
        landed = { ...landed, [attribute]: after[attribute] };
        holdAttributes(at, landed);
      });

      // L'anneau a fini de se redistribuer : Vitality se pose, seule, sur le reste du battement.
      holdAttributes(attributesBeat.until, after);

      // Et la barre **tient sa butée** pendant tout le battement. Elle ne joue rien ici — c'est
      // le tour des jauges — mais ne poser aucun point revient à la laisser à `interpolate`,
      // qui ne connaît pas les beats : elle descendrait en ligne droite depuis le repos de
      // lecture jusqu'au zéro de la bascule, et se viderait pendant les ~1,8 s du cercle. La
      // bascule ne ferait alors plus retomber une barre pleine, et l'or de la crête s'allumerait
      // sur un remplissage déjà nul. Un point immobile suffit : c'est le même geste que les
      // `holdBar` de `session`, et pour la même raison.
      holdBar(attributesBeat.until, workout.level.reached.length > 0 ? 1 : fillAfter(workout.level));
    }

    // 3. `level.reached` — un basculement par niveau franchi. Plusieurs d'un coup est un cas
    //    normal, pas l'exception : on les joue tous, l'un après l'autre. La barre retombe à
    //    zéro et repart — ce dent-de-scie *est* la mise en scène du level up.
    workout.level.reached.forEach((level, position) => {
      const span = push({ kind: 'level', duration: BEATS.levelFlip, workout: index, level });
      const isLast = position === workout.level.reached.length - 1;
      crossings.push(span.at);
      holdBar(span.at + 1, 0);
      holdBar(span.until, isLast ? fillAfter(workout.level) : 1);
    });

    // 4. `titlesUnlocked` — le titre tombe. Rare, donc il prend son temps.
    workout.titlesUnlocked.forEach((_, position) => {
      push({ kind: 'title', duration: BEATS.titleDrop, workout: index, index: position });
    });

    // 4bis. Puis le palier se lit, comme le breakdown et les jauges (#79). Il tient l'écran
    //       jusqu'à l'ouverture de la séance suivante — voir `segments` — donc c'est bien ce
    //       repos-ci qui le lui donne, en reculant cette ouverture.
    //       Seulement s'il s'est passé quelque chose : sans niveau ni titre, `LevelStage`
    //       n'est même pas monté, et ce serait du temps mort devant un écran vide.
    if (workout.level.reached.length > 0 || workout.titlesUnlocked.length > 0) {
      const read = push({ kind: 'rest', duration: BEATS.dwell });
      holdBar(read.until, fillAfter(workout.level));
    }

    // 5. `loot`, puis `coins` — juste après, rien entre les deux (#226). Un tirage bredouille
    //    et une bourse à gain nul ne consomment aucun temps : même règle que les jauges à
    //    zéro (#80), et pour la même raison — une séance sur deux ne fait rien tomber, lui
    //    donner un temps d'écran vide dirait « il ne s'est rien passé » à quelqu'un qui vient
    //    de s'entraîner, et ce serait la deuxième fois.
    if (workout.loot.length > 0 || workout.coins.gained > 0) {
      workout.loot.forEach((_, position) => {
        push({ kind: 'loot', duration: BEATS.lootDrop, workout: index, index: position });
      });

      // La bourse court de son avant à son après — jamais de zéro à `gained`, qui ne sert
      // qu'à décider si ce battement a lieu.
      const coins = push({
        kind: 'coins',
        duration: BEATS.coinsSettle,
        workout: index,
        gained: workout.coins.gained,
        before: workout.coins.before,
        after: workout.coins.after,
      });
      holdPurse(coins.at, workout.coins.before);
      holdPurse(coins.until, workout.coins.after);

      // Le temps de lire ce qui vient de tomber, comme le breakdown et le palier.
      const read = push({ kind: 'rest', duration: BEATS.dwell });
      holdPurse(read.until, workout.coins.after);
    }

    // `streak`, `unlockableNodes` — présents et vides jusqu'aux Lots 5 et 7. On les saute
    // tant qu'ils le sont ; on ne les rend pas optionnels pour autant.
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
      crossings.push(end);
    });
    holdBar(span.until, last === undefined ? 0 : fillAfter(last.level));

    // Le compteur, lui, va tout droit jusqu'au total : c'est la valeur que le joueur
    // retiendra, et elle vient de `totals`, pas d'une somme refaite ici.
    holdCounter(span.until, summary.totals?.xpAwarded ?? running);
    running = summary.totals?.xpAwarded ?? running;

    // Le cercle ne se montre pas ici, mais les cinq jauges continuent d'y courir sous le
    // condensé : l'arrivée du dernier `imported` doit être exacte quand le joueur saute,
    // condensé compris — sans ça le saut sur `quinze-workouts` s'arrêterait un cran trop tôt.
    holdAttributes(span.until, last === undefined ? zeroAttributes : attributesAt(last.attributes, 'after'));

    // La bourse, elle, ne fait pas de dent-de-scie : rien n'y « bute » comme un palier. Elle
    // monte tout droit vers l'après du dernier workout du lot — un objet tombé dans le
    // condensé ne rejoue pas son propre battement, mais la pièce qu'il a rapportée arrive
    // bien ici, et se retrouve au bilan.
    holdPurse(span.until, last === undefined ? purseStart : last.coins.after);
  }

  // Ce qui n'a rien rapporté, nommé — et **en dernier**. Un écart est une note en bas de page,
  // pas une célébration : le faire passer avant l'XP ferait commencer l'écran par un refus.
  if (summary.skipped.length > 0) {
    push({ kind: 'skipped', duration: BEATS.skipped });
  }

  // Le bilan ferme la séquence, et il ne se referme pas lui-même (#79). C'est le battement
  // que le saut atteint, et celui sur lequel l'écran se repose : `totals` existe **pour ça**,
  // son propre docblock au contrat le dit — « le raccourci de l'écran de résumé, et ce que
  // voit le joueur qui saute l'animation ». Il était servi depuis le début, il n'avait
  // jamais été affiché.
  //
  // Sans rien de crédité, il n'y a pas d'état d'arrivée : on garde le simple temps de
  // respirer, et l'écran reste ce qu'il est déjà — un compte rendu, avec ses écarts nommés.
  const closing =
    summary.totals === null
      ? push({ kind: 'rest', duration: BEATS.tail })
      : push({ kind: 'recap', duration: BEATS.recap });

  holdBar(closing.until, last === undefined ? start : fillAfter(last.level));
  holdCounter(closing.until, summary.totals?.xpAwarded ?? running);
  holdAttributes(closing.until, last === undefined ? zeroAttributes : attributesAt(last.attributes, 'after'));
  holdPurse(closing.until, last === undefined ? purseStart : last.coins.after);

  // Un segment court de l'ouverture d'une séance à l'ouverture de la suivante ; le dernier
  // s'arrête là où le détail cède la place — au condensé, aux écarts, ou au bilan.
  //
  // **Le bilan compte dans cette liste**, et il n'y est pas par symétrie : sans lui, une
  // synchronisation sans condensé ni écart laissait `afterDetail` valoir `cursor`, donc le
  // dernier palier restait à l'écran *par-dessus* le bilan qu'il est censé laisser paraître.
  const openings = beats.filter((beat) => beat.kind === 'session');
  const afterDetail =
    beats.find(
      (beat) => beat.kind === 'digest' || beat.kind === 'skipped' || beat.kind === 'recap',
    )?.at ?? cursor;

  const segments = openings.map((opening, index) => ({
    workout: opening.workout,
    // Le premier bloc occupe l'écran dès l'ouverture : l'anticipation lui appartient, c'est
    // pendant elle qu'il monte. Les suivants prennent la place du précédent, à son beat.
    at: index === 0 ? 0 : opening.at,
    until: openings[index + 1]?.at ?? afterDetail,
  }));

  // La crête : un éclat par franchissement, monté sur `glint` et rendu sur `tap`. Il culmine
  // **à** l'ouverture du basculement — c'est le même instant que le choc haptique, et les
  // deux doivent tomber ensemble ou aucun des deux ne se remarque.
  const crest: Ramp = { input: [0], output: [0] };
  crossings.forEach((at) => {
    crest.input.push(at - duration.glint, at, at + duration.tap);
    crest.output.push(0, 1, 0);
  });
  crest.input.push(cursor);
  crest.output.push(0);

  return {
    beats,
    duration: cursor,
    bar: strictlyIncreasing(bar),
    counter: strictlyIncreasing(counter),
    purse: strictlyIncreasing(purse),
    attributes: {
      strength: strictlyIncreasing(attributes.strength),
      endurance: strictlyIncreasing(attributes.endurance),
      mobility: strictlyIncreasing(attributes.mobility),
      dexterity: strictlyIncreasing(attributes.dexterity),
      vitality: strictlyIncreasing(attributes.vitality),
    },
    crest: strictlyIncreasing(crest),
    crossings,
    totals: summary.totals ?? null,
    segments,
  };
}
