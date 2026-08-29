import type { components } from '@/api/schema';
import { duration } from '@/design/tokens';

export type Battle = components['schemas']['Battle'];
export type BattleEvent = components['schemas']['BattleEvent'];
export type BattleFighter = components['schemas']['BattleFighter'];
export type BattleEnemy = components['schemas']['BattleEnemy'];
/** `PLAYER` ou `ENEMY` — l'union du schéma, jamais recopiée. */
export type Actor = NonNullable<BattleEvent['attacker']>;
export type BattleResult = Battle['result'];

/**
 * Un combat traduit en **une** timeline continue.
 *
 * Le serveur a tout simulé : la timeline arrive complète, dans l'ordre, chaque coup portant
 * les points de vie restants de sa cible. Il n'y a rien à décider ici, seulement à mettre en
 * scène — et c'est exactement le partage que `reward/timeline.ts` a établi, jusqu'à la forme
 * des fichiers.
 *
 * C'est une fonction **pure** : pas de React, pas de Reanimated, pas d'horloge. Elle se prouve
 * sur les fixtures capturées sans monter le moindre composant, et le composant ne fait
 * qu'interpoler.
 *
 * ————— L'ordre est le contrat, et on ne fait rien pour le tenir ————————————————————————
 *
 * « L'ordre des éléments de la liste est le seul qui compte », dit le contrat, et un
 * `EXTRA_TURN` est émis **après** le coup qui l'a déclenché et **avant** celui qu'il accorde :
 * la cause puis l'effet. Il n'y a donc ni tri, ni regroupement, ni réordonnancement à faire —
 * seulement à ne pas en faire. C'est le genre de règle qu'on casse en voulant « ranger ».
 */

/**
 * Les temps de la mise en scène, en millisecondes.
 *
 * Comme dans `reward/timeline.ts` : les *durées* sortent de l'échelle du design system,
 * mesurée au spike (#4) sur un iPhone physique ; le *choix* — quel temps pour quel moment —
 * appartient à ce fichier. Le budget, lui, s'écrit en clair, parce qu'il ne décrit pas un
 * geste mais une quantité à écouler.
 */
export const BEATS = {
  /**
   * L'ouverture : les deux combattants se posent avec leurs valeurs.
   *
   * C'est le seul moment où on lit le rapport de force — 373 points de vie contre 700, ça se
   * regarde — et il ne se joue pas au tempo du reste. Allongée après essai sur appareil : le
   * temps de poser deux noms et quatre chiffres, pas celui d'un geste.
   */
  opening: duration.drop,
  /**
   * Le dernier échange, celui qui conclut.
   *
   * Il garde son temps plein **quel que soit le tempo**. Le coup qui tue est le seul qui
   * compte, et le jouer à 150 ms parce que le combat était long reviendrait à escamoter la
   * seule image que le joueur retiendra.
   */
  finalBlow: duration.settle,
  /** Le verdict tombe, et l'écran s'arrête dessus. */
  verdict: duration.drop,
} as const;

/**
 * Le budget d'un combat à l'écran, en millisecondes.
 *
 * **Quatorze secondes, et pas neuf.** Le premier chiffre venait du raisonnement — « au-delà, on
 * regarde une bande dont on connaît l'issue » — et l'appareil l'a démenti : à neuf secondes,
 * un combat de quinze échanges défile trop vite pour qu'on suive **qui** frappe. Le budget ne
 * borne pas l'ennui, il borne la lecture, et la lecture est plus lente qu'on ne l'écrit.
 *
 * C'est une quantité à écouler, pas un geste — d'où sa place ici, en clair, et non dans
 * `tokens.ts` où elle ralentirait autre chose en la modifiant.
 */
export const BUDGET = 14_000;

/**
 * Les deux bornes du tempo.
 *
 * Le plancher empêche un combat de deux cents tours de devenir un stroboscope ; le plafond
 * empêche un combat de six tours de traîner. Ce sont des durées, donc elles sortent de
 * l'échelle du design system.
 *
 * **Les deux ont été relevées après essai sur appareil.** `line` en plafond et `glint` en
 * plancher étaient calées sur ce qu'un *élément* met à paraître ; un échange n'est pas un
 * élément, c'est une phrase à lire — qui frappe, combien, et sur quelle barre. `settle`, « une
 * carte qui se referme », est la bonne échelle pour ça ; `pop`, « ce qui se pose en prenant
 * son échelle », est le minimum en dessous duquel on ne lit plus, on constate.
 */
export const TEMPO_FLOOR = duration.pop;
export const TEMPO_CEILING = duration.settle;

export type BattleBeat =
  /** Les deux combattants se posent. */
  | { kind: 'opening'; at: number; until: number }
  | {
      kind: 'attack';
      at: number;
      until: number;
      index: number;
      attacker: Actor;
      /** Ce qui a **réellement** été retiré — la mitigation est déjà défalquée par le serveur. */
      damage: number;
      /** La part absorbée, en plus des dégâts portés. Zéro quand le défenseur n'a pas d'armure. */
      mitigated: number;
    }
  /**
   * La cible a esquivé : aucun point de vie ne bouge.
   *
   * `attacker` est celui qui frappait — **l'esquiveur est l'autre**. Le contrat le dit en
   * toutes lettres, et se tromper de camp ici produit une animation qui a l'air de marcher.
   */
  | { kind: 'dodge'; at: number; until: number; index: number; attacker: Actor; dodger: Actor }
  | { kind: 'extraTurn'; at: number; until: number; index: number; actor: Actor }
  /** Le verdict — **le seul battement qui ne se referme pas**. Il court jusqu'à `duration`. */
  | { kind: 'verdict'; at: number; until: number; result: BattleResult };

/** Une rampe d'interpolation : `input` sont des instants, `output` la valeur à cet instant. */
export type Ramp = { input: number[]; output: number[] };

/**
 * Tout ce qui s'anime pour **un** camp.
 *
 * Regrouper par camp plutôt que par nature — cinq rampes ici, cinq là — n'est pas un rangement
 * de convenance : le composant rend deux blocs symétriques, et un bloc qui reçoit son camp
 * entier ne peut pas se tromper de côté. La confusion des camps est l'erreur que ce fichier
 * coûte le plus cher à commettre, puisqu'elle produit une animation qui a l'air de marcher.
 */
export type SideRamps = {
  /**
   * Les points de vie, en valeur **absolue**.
   *
   * Jamais une fraction déjà calculée : le composant affiche le nombre autant qu'il remplit la
   * barre. Et jamais une soustraction — chaque valeur vient de `targetHpRemaining`, que le
   * serveur envoie précisément pour que le client n'ait rien à recalculer.
   */
  hp: Ramp;
  /** Les points de vie de départ, dont la barre tire sa part. */
  maxHp: number;
  /** Les dégâts encaissés au dernier coup — un palier, pas une courbe. */
  damage: Ramp;
  /** La part absorbée par l'armure sur ce même coup. Zéro quand il n'y en a pas. */
  mitigated: Ramp;
  /** L'éclat du chiffre de dégât : 0 → 1 → 0 sur le battement du coup encaissé. */
  damageFlash: Ramp;
  /**
   * L'éclat de la part absorbée — **allumé seulement quand il y a quelque chose à absorber**.
   *
   * Une rampe distincte plutôt qu'un test dans le composant : « dont 0 absorbés » dirait le
   * contraire de ce qui se passe chez un combattant sans armure, et la décision de ne rien
   * afficher est une décision de mise en scène. Elle appartient donc à ce fichier, où elle se
   * prouve sur les fixtures — `victoire` n'a aucune mitigation des deux côtés, et c'est
   * précisément le cas qui l'exige.
   */
  mitigatedFlash: Ramp;
  /** L'éclat d'une esquive **de ce camp** — celui qui esquive, pas celui qui frappait. */
  dodgeFlash: Ramp;
  /** L'éclat d'un tour supplémentaire **de ce camp**. */
  extraFlash: Ramp;
};

/**
 * Ce qui s'est passé, en chiffres — le bilan que l'écran de fin raconte.
 *
 * ————— Est-ce de la logique de jeu ? Non, et voici la frontière ————————————————————————
 *
 * L'interdit du dépôt vise les **décisions** : pas de calcul d'XP, pas de tirage de loot, pas
 * de règle de streak. Rien ici n'est décidé : ce sont des sommes et des comptes sur des
 * événements que le serveur a déjà envoyés en entier, et **aucun n'est accordé à personne**.
 * Retirer ce bilan ne changerait pas un point de vie ; il ne fait que dire à voix haute ce que
 * la timeline contient déjà.
 *
 * L'alternative serait de le demander au back — qui devrait alors renvoyer, à côté d'une
 * timeline complète, un résumé de cette même timeline. C'est la seule fois où « ça s'ajoute au
 * contrat » serait le mauvais réflexe : on demanderait au serveur de dire deux fois la même
 * chose pour éviter une addition.
 *
 * `turns` fait exception et vient du serveur : un tour n'est pas un événement — un tour
 * supplémentaire en produit deux — et le recompter ici serait, cette fois, réimplémenter une
 * règle.
 */
export type BattleTally = {
  /** Du serveur, jamais recompté : un tour n'est pas un événement. */
  turns: number;
  /** Les coups qui ont porté, de chaque côté. Les esquives n'en sont pas. */
  blowsLanded: number;
  blowsTaken: number;
  /** Ce qui a réellement été retiré — la mitigation est déjà défalquée par le serveur. */
  damageDealt: number;
  damageTaken: number;
  /** Ce que l'armure a absorbé, de chaque côté. Zéro sans Endurance. */
  damageAbsorbed: number;
  dodges: number;
  dodgesConceded: number;
  extraTurns: number;
  extraTurnsConceded: number;
  /** Ce qu'il restait au joueur à la fin. Zéro sur une défaite, par construction. */
  hpLeft: number;
  /** Le dernier coup porté, quel qu'en soit l'auteur — celui qui a conclu. */
  lastBlow: { by: Actor; damage: number } | null;
};

export type BattleTimeline = {
  beats: BattleBeat[];
  /** Durée totale, en ms. La valeur que le saut fait atteindre d'un coup. */
  duration: number;
  player: SideRamps;
  enemy: SideRamps;
  /**
   * Les instants où un coup **porte**, pour l'haptique.
   *
   * Les esquives n'y sont pas : rien n'a été encaissé, et faire vibrer sur une esquive dirait
   * le contraire de ce qui se passe. Ils sont ici parce qu'ils sont déjà connus ici.
   */
  blows: number[];
  /** Le tempo retenu, en ms par échange. Rendu pour que les tests puissent le lire. */
  tempo: number;
  /** Ce qui s'est passé, en chiffres. Voir `BattleTally`. */
  tally: BattleTally;
};

/**
 * Le temps que prend un échange, une fois la longueur du combat connue.
 *
 * C'est **la** décision de mise en scène de ce fichier, et elle remplace le condensé du
 * `SyncSummary`. Un lot de séances est une addition dont on peut résumer le milieu sans rien
 * perdre ; un combat est un récit dont le milieu est ce qui fait qu'on y croit. On ne condense
 * donc pas : on joue tout, et le tempo absorbe la longueur.
 *
 * **Au plancher, un combat très long dépasse le budget, et c'est voulu.** Le plancher sert la
 * lisibilité, le budget sert le confort ; quand les deux se contredisent, la lisibilité gagne.
 * Le rattrapage est le saut — toucher l'écran — pas un condensé qu'on vient d'écarter.
 */
export function tempoFor(exchanges: number): number {
  if (exchanges <= 0) {
    return TEMPO_CEILING;
  }

  return Math.min(TEMPO_CEILING, Math.max(TEMPO_FLOOR, Math.round(BUDGET / exchanges)));
}

/** L'autre camp. Une esquive se joue chez la cible, pas chez l'attaquant. */
function opponentOf(actor: Actor): Actor {
  return actor === 'PLAYER' ? 'ENEMY' : 'PLAYER';
}

/**
 * Prolonge une rampe jusqu'à `t` sans rien changer à sa valeur.
 *
 * Les rampes doivent courir jusqu'à la fin de la timeline : sans ce dernier point,
 * `interpolate` extrapolerait au-delà du dernier coup et les barres bougeraient pendant le
 * verdict, c'est-à-dire au moment précis où l'écran doit être stable.
 */
function holdUntil(ramp: Ramp, t: number): void {
  const lastInput = ramp.input[ramp.input.length - 1];

  if (t > lastInput) {
    ramp.input.push(t);
    ramp.output.push(ramp.output[ramp.output.length - 1]);
  }
}

/**
 * Ajoute un palier à une rampe : la valeur tient jusqu'à `from`, puis glisse jusqu'à `to`.
 *
 * Le palier est ce qui empêche une barre de dériver pendant les battements qui ne la touchent
 * pas — une esquive, un tour supplémentaire. Sans lui, `interpolate` tracerait une droite du
 * dernier coup jusqu'au suivant et les points de vie descendraient **pendant** l'esquive,
 * c'est-à-dire exactement là où le contrat garantit qu'ils ne bougent pas.
 */
function slideTo(ramp: Ramp, from: number, to: number, value: number): void {
  holdUntil(ramp, from);
  ramp.input.push(to);
  ramp.output.push(value);
}

/**
 * Une marche : la valeur change à `at`, sur une milliseconde.
 *
 * Les chiffres de dégât ne se dégradent pas d'une valeur à l'autre, ils se remplacent. La
 * milliseconde existe parce qu'`interpolate` exige des instants strictement croissants — elle
 * n'est jamais visible, le chiffre étant éteint hors de son éclat.
 */
function stepTo(ramp: Ramp, at: number, value: number): void {
  holdUntil(ramp, at);
  ramp.input.push(at + 1);
  ramp.output.push(value);
}

/**
 * Un éclat : 0 avant, 1 au tiers du battement, 0 à la fin.
 *
 * Il monte vite et redescend lentement, comme tout ce qui se remarque sans se lire — la valeur
 * est au tiers et non au milieu pour ça. Entre deux éclats la rampe vaut zéro des deux côtés,
 * donc l'interpolation y reste plate : il n'y a pas de palier à poser.
 */
function pulse(ramp: Ramp, at: number, until: number): void {
  holdUntil(ramp, at);
  ramp.input.push(at + Math.round((until - at) / 3));
  ramp.output.push(1);
  ramp.input.push(until);
  ramp.output.push(0);
}

/** Les rampes d'un camp, au départ du combat. */
function sideRamps(maxHp: number): SideRamps {
  return {
    hp: { input: [0], output: [maxHp] },
    maxHp,
    damage: { input: [0], output: [0] },
    mitigated: { input: [0], output: [0] },
    damageFlash: { input: [0], output: [0] },
    mitigatedFlash: { input: [0], output: [0] },
    dodgeFlash: { input: [0], output: [0] },
    extraFlash: { input: [0], output: [0] },
  };
}

export function buildBattleTimeline(battle: Battle): BattleTimeline {
  const events = battle.events;

  // Les échanges sont tout ce qui se joue entre l'ouverture et le verdict. `BATTLE_STARTED` et
  // `BATTLE_FINISHED` ont leur propre temps et ne se comptent donc pas dans le tempo.
  const exchanges = events.filter(
    (event) => event.type === 'ATTACK' || event.type === 'DODGE' || event.type === 'EXTRA_TURN',
  ).length;

  const tempo = tempoFor(exchanges);

  const beats: BattleBeat[] = [];
  const blows: number[] = [];

  const tally: BattleTally = {
    turns: battle.turns,
    blowsLanded: 0,
    blowsTaken: 0,
    damageDealt: 0,
    damageTaken: 0,
    damageAbsorbed: 0,
    dodges: 0,
    dodgesConceded: 0,
    extraTurns: 0,
    extraTurnsConceded: 0,
    hpLeft: 0,
    lastBlow: null,
  };

  const player = sideRamps(battle.player.hp);
  const enemy = sideRamps(battle.enemy.hp);
  const sideOf = (actor: Actor): SideRamps => (actor === 'PLAYER' ? player : enemy);

  let at = 0;
  let seen = 0;
  let index = 0;

  for (const event of events) {
    if (event.type === 'BATTLE_STARTED') {
      const until = at + BEATS.opening;
      beats.push({ kind: 'opening', at, until });
      at = until;
      continue;
    }

    if (event.type === 'BATTLE_FINISHED') {
      // Le verdict est le dernier, toujours — c'est le contrat. Son `until` est la durée
      // totale : il court jusqu'au bout et y reste, au lieu d'être chassé comme les autres.
      const until = at + BEATS.verdict;
      beats.push({ kind: 'verdict', at, until, result: event.result ?? battle.result });
      at = until;
      continue;
    }

    seen += 1;
    // Le dernier échange garde son temps plein, quel que soit le tempo.
    const span = seen === exchanges ? Math.max(tempo, BEATS.finalBlow) : tempo;
    const until = at + span;

    if (event.type === 'ATTACK') {
      const attacker = event.attacker ?? 'PLAYER';
      const damage = event.damage ?? 0;
      const mitigated = event.mitigated ?? 0;
      const remaining = event.targetHpRemaining ?? 0;

      // La cible est **l'autre** : `targetHpRemaining` décrit celui qui encaisse, et c'est
      // chez lui que le chiffre paraît. Se tromper de camp ici produit une animation qui a
      // l'air de marcher.
      const target = sideOf(opponentOf(attacker));

      slideTo(target.hp, at, until, remaining);
      stepTo(target.damage, at, damage);
      stepTo(target.mitigated, at, mitigated);
      pulse(target.damageFlash, at, until);

      if (mitigated > 0) {
        pulse(target.mitigatedFlash, at, until);
      }

      if (attacker === 'PLAYER') {
        tally.blowsLanded += 1;
        tally.damageDealt += damage;
      } else {
        tally.blowsTaken += 1;
        tally.damageTaken += damage;
        // Ce que **le joueur** a absorbé : la mitigation d'un coup qu'il encaisse. Compter
        // celle de l'adversaire au même endroit mélangerait deux armures dans un seul chiffre.
        tally.damageAbsorbed += mitigated;
      }

      tally.lastBlow = { by: attacker, damage };

      blows.push(until);
      beats.push({ kind: 'attack', at, until, index, attacker, damage, mitigated });
    } else if (event.type === 'DODGE') {
      const attacker = event.attacker ?? 'PLAYER';
      const dodger = opponentOf(attacker);

      // Rien ne bouge : aucune rampe de points de vie n'est touchée, et c'est le test qui le
      // prouve battement par battement.
      pulse(sideOf(dodger).dodgeFlash, at, until);

      if (dodger === 'PLAYER') {
        tally.dodges += 1;
      } else {
        tally.dodgesConceded += 1;
      }

      beats.push({ kind: 'dodge', at, until, index, attacker, dodger });
    } else {
      const actor = event.actor ?? 'PLAYER';

      pulse(sideOf(actor).extraFlash, at, until);

      if (actor === 'PLAYER') {
        tally.extraTurns += 1;
      } else {
        tally.extraTurnsConceded += 1;
      }

      beats.push({ kind: 'extraTurn', at, until, index, actor });
    }

    index += 1;
    at = until;
  }

  for (const side of [player, enemy]) {
    holdUntil(side.hp, at);
    holdUntil(side.damage, at);
    holdUntil(side.mitigated, at);
    holdUntil(side.damageFlash, at);
    holdUntil(side.mitigatedFlash, at);
    holdUntil(side.dodgeFlash, at);
    holdUntil(side.extraFlash, at);
  }

  // Les points de vie qui restent au joueur : la dernière valeur de sa rampe, celle que le
  // serveur a écrite. Jamais une soustraction, ici comme partout ailleurs dans ce fichier.
  tally.hpLeft = player.hp.output[player.hp.output.length - 1];

  return { beats, duration: at, player, enemy, blows, tempo, tally };
}
