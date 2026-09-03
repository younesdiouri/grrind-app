import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { BEATS, buildTimeline, hasAwardedXp, DETAILED_WORKOUTS, type Beat, type SyncSummary } from './timeline.ts';

/**
 * La timeline, éprouvée sur les **réponses réelles** du back.
 *
 * Ce banc ne monte aucun composant et n'attend aucune frame : `buildTimeline` est pure, donc
 * tout ce que le joueur verra est décidé ici et se vérifie en quelques millisecondes. C'est la
 * raison d'être de la séparation — une mise en scène qu'on ne peut vérifier qu'à l'œil sur un
 * appareil est une mise en scène qu'on ne vérifie pas.
 *
 * Les fixtures se lisent depuis le disque plutôt que par `import` : `node --test` efface les
 * types mais ne résout pas l'alias `@/`, et ce banc n'a pas à connaître la configuration de
 * Metro pour lire quatre fichiers JSON.
 */
function fixture(name: string): SyncSummary {
  return JSON.parse(
    readFileSync(new URL(`../../../fixtures/sync-summary/${name}.json`, import.meta.url), 'utf8'),
  ) as SyncSummary;
}

const unWorkout = fixture('un-workout');
const troisWorkouts = fixture('trois-workouts');
const quinzeWorkouts = fixture('quinze-workouts');
const toutEcarte = fixture('tout-ecarte');
const marcheSansXp = fixture('marche-sans-xp');
const avecLoot = fixture('avec-loot');

const ATTRIBUTES: ('strength' | 'endurance' | 'mobility' | 'dexterity' | 'vitality')[] = [
  'strength',
  'endurance',
  'mobility',
  'dexterity',
  'vitality',
];

/**
 * La valeur d'une rampe à un instant quelconque — exactement ce que `interpolate` lit sur le
 * thread UI, y compris **entre** deux points. Une rampe se juge là, pas seulement sur les
 * instants qu'elle porte : un point manquant ne se voit qu'au milieu du trou qu'il laisse.
 */
function fillAt(ramp: { input: number[]; output: number[] }, at: number): number {
  const next = ramp.input.findIndex((instant) => instant >= at);
  if (next <= 0) return ramp.output[next === 0 ? 0 : ramp.output.length - 1];

  const span = ramp.input[next] - ramp.input[next - 1];
  const progress = span === 0 ? 0 : (at - ramp.input[next - 1]) / span;

  return ramp.output[next - 1] + progress * (ramp.output[next] - ramp.output[next - 1]);
}

/** La rampe est-elle exploitable par `interpolate` ? */
function assertRampIsSane(ramp: { input: number[]; output: number[] }, duration: number): void {
  assert.equal(ramp.input.length, ramp.output.length, 'autant de points que de valeurs');
  assert.ok(ramp.input.length >= 2, 'au moins deux points');

  for (let i = 1; i < ramp.input.length; i += 1) {
    assert.ok(
      ramp.input[i] > ramp.input[i - 1],
      `les instants doivent croître strictement (${ramp.input[i - 1]} → ${ramp.input[i]})`,
    );
  }

  assert.equal(ramp.input[0], 0, "la rampe commence à l'instant zéro");
  assert.equal(ramp.input[ramp.input.length - 1], duration, 'et finit à la fin de la séquence');
}

describe('la timeline du SyncSummary', () => {
  it("joue les workouts dans l'ordre du serveur, sans jamais les trier", () => {
    const timeline = buildTimeline(troisWorkouts);
    const sessions = timeline.beats.filter((beat) => beat.kind === 'session');

    assert.deepEqual(
      sessions.map((beat) => beat.workout),
      [0, 1, 2],
    );
    // L'ordre du payload est celui du crédit : chaque séance commence après la précédente.
    for (let i = 1; i < sessions.length; i += 1) {
      assert.ok(sessions[i].at > sessions[i - 1].at);
    }
  });

  it('enchaîne la barre sans discontinuité : la fin de chaque workout est le départ du suivant', () => {
    // C'est ce que le palier de départ servi par le back (grrind-back#79) achète, et ça se
    // vérifie sur le payload lui-même : si ces deux-là divergeaient, la barre sauterait.
    const workouts = troisWorkouts.imported;

    for (let i = 1; i < workouts.length; i += 1) {
      assert.equal(workouts[i].level.xpIntoLevelBefore, workouts[i - 1].level.xpIntoLevel);
      assert.equal(workouts[i].level.xpToNextLevelBefore, workouts[i - 1].level.xpToNextLevel);
    }
  });

  it('anime tous les niveaux franchis du lot, pas seulement le dernier', () => {
    const timeline = buildTimeline(troisWorkouts);
    const flips = timeline.beats.filter((beat) => beat.kind === 'level').map((beat) => beat.level);

    assert.deepEqual(flips, [2, 3], 'les deux niveaux de la fixture');
    assert.equal(troisWorkouts.totals?.levelBefore, 1);
    assert.equal(troisWorkouts.totals?.levelAfter, 3);
  });

  it('compte l\'XP sur toute la synchronisation, et non par workout', () => {
    const timeline = buildTimeline(troisWorkouts);
    const lines = timeline.beats.filter((beat) => beat.kind === 'xpLine');

    // Le compteur ne se remet pas à zéro entre deux séances : c'est une seule course.
    for (let i = 1; i < lines.length; i += 1) {
      const step = lines[i].runningTotal - lines[i - 1].runningTotal;
      assert.equal(step, lines[i].line.amount);
    }
    assert.equal(lines[lines.length - 1].runningTotal, troisWorkouts.totals?.xpAwarded);
  });

  /**
   * La marche (#80) — créditée, visible, et sans un point d'expérience.
   *
   * C'est le **deuxième** zéro du produit, et il ne dit pas du tout la même chose que celui de
   * `tout-ecarte`. Là-bas, rien n'a été crédité et `totals` vaut `null`. Ici une séance a bien
   * été comptée — elle est en base, elle est dans l'historique — mais sa discipline ne rapporte
   * pas d'XP par conception : `breakdown` est vide, `awarded` vaut zéro, et le serveur envoie
   * une `reason` plutôt qu'une ligne « base : 0 » qui mentirait sur un calcul qui n'a jamais eu
   * lieu.
   */
  describe('une séance créditée qui ne rapporte pas d’XP', () => {
    it('joue la raison à la place du calcul', () => {
      const timeline = buildTimeline(marcheSansXp);

      assert.equal(marcheSansXp.imported[0].xp.breakdown.length, 0, 'la fixture est bien la bonne');
      assert.equal(marcheSansXp.imported[0].xp.reason, 'NO_XP_FEEDS_VITALITY');

      const lines = timeline.beats.filter((beat) => beat.kind === 'xpLine');
      const reason = timeline.beats.find((beat) => beat.kind === 'noCredit');

      assert.equal(lines.length, 0, 'aucune ligne à jouer');
      assert.ok(reason !== undefined, 'mais quelque chose à dire');
      assert.equal(reason.reason, 'NO_XP_FEEDS_VITALITY');
    });

    it('ne monte pas l’anneau : rien n’a été redistribué', () => {
      // Le montrer immobile ferait croire à une animation qui a raté — et ce serait la
      // deuxième fois de suite qu'on dit « il ne s'est rien passé ».
      const timeline = buildTimeline(marcheSansXp);

      assert.equal(
        timeline.beats.some((beat) => beat.kind === 'attributes'),
        false,
      );
    });

    it('garde la barre immobile, sans la faire dériver', () => {
      const timeline = buildTimeline(marcheSansXp);
      const level = marcheSansXp.imported[0].level;
      const span = level.xpIntoLevelBefore + (level.xpToNextLevelBefore ?? 0);
      const expected = span === 0 ? 1 : level.xpIntoLevelBefore / span;

      assert.ok(timeline.bar.output.every((fill) => fill === expected));
    });

    it('ne traite pas son zéro importé comme un gain XP à éclairer', () => {
      assert.equal(hasAwardedXp(buildTimeline(marcheSansXp).totals), false);
      assert.equal(hasAwardedXp(buildTimeline(unWorkout).totals), true);
    });

    it('se referme quand même sur un bilan : la séance a bien été comptée', () => {
      // La différence exacte avec `tout-ecarte`, et elle tient à `totals`.
      const timeline = buildTimeline(marcheSansXp);

      assert.notEqual(marcheSansXp.totals, null);
      assert.equal(marcheSansXp.totals?.xpAwarded, 0);
      assert.equal(marcheSansXp.totals?.workoutCount, 1);
      assert.ok(timeline.beats.some((beat) => beat.kind === 'recap'));
    });

    it('ne teste jamais la discipline : c’est `xp.reason` qui décide', () => {
      // Le jour où une deuxième discipline rejoint la marche, il n'y a rien à changer dans le
      // client. On le prouve en retirant la raison d'une séance de marche : la mise en scène
      // doit repasser au chemin normal, sans que `WALKING` change quoi que ce soit.
      const summary: SyncSummary = {
        ...marcheSansXp,
        imported: [
          {
            ...marcheSansXp.imported[0],
            xp: { ...marcheSansXp.imported[0].xp, reason: null },
          },
        ],
      };

      const timeline = buildTimeline(summary);
      assert.equal(
        timeline.beats.some((beat) => beat.kind === 'noCredit'),
        false,
      );
      assert.ok(timeline.beats.some((beat) => beat.kind === 'attributes'));
    });
  });

  /**
   * Le bilan (#79) — le seul battement qui ne se referme pas.
   *
   * Le défaut qu'il répare ne se voyait dans aucun test parce qu'aucun ne regardait la **fin**
   * de la séquence : chaque bloc était correct, chaque rampe arrivait au bon endroit, et l'écran
   * était pourtant vide à la dernière image. Ce banc-ci regarde ce qui reste, pas ce qui passe.
   */
  describe('le bilan qui ferme la séquence', () => {
    it('ferme les trois synchronisations créditées, et court jusqu\'au bout', () => {
      for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts]) {
        const timeline = buildTimeline(summary);
        const recap = timeline.beats.find((beat) => beat.kind === 'recap');

        assert.ok(recap !== undefined, 'une synchronisation créditée se referme sur son bilan');
        // C'est *la* propriété du ticket : il ne se termine pas avant la séquence, donc il ne
        // peut pas laisser l'écran nu.
        assert.equal(recap.until, timeline.duration);
        // Et il est bien le dernier : rien ne se joue après lui.
        assert.equal(timeline.beats[timeline.beats.length - 1], recap);
      }
    });

    it("n'invente pas d'état d'arrivée quand rien n'est arrivé", () => {
      const timeline = buildTimeline(toutEcarte);

      assert.equal(toutEcarte.totals, null, 'la fixture est bien celle qui ne crédite rien');
      assert.equal(
        timeline.beats.some((beat) => beat.kind === 'recap'),
        false,
      );
    });

    it('laisse la place au bilan : aucun détail ne tient encore l\'écran quand il paraît', () => {
      // Le défaut le plus discret du ticket. Sans condensé ni écart, la fenêtre du dernier
      // palier s'étendait jusqu'à `duration` — donc par-dessus le bilan qu'elle est censée
      // laisser paraître.
      for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts]) {
        const timeline = buildTimeline(summary);
        const recap = timeline.beats.find((beat) => beat.kind === 'recap');
        assert.ok(recap !== undefined);

        for (const segment of timeline.segments) {
          assert.ok(
            segment.until <= recap.at,
            `le détail du workout ${segment.workout} déborde sur le bilan`,
          );
        }
      }
    });

    it('le saut tombe sur le bilan, sans cas particulier', () => {
      // Poser l'horloge à la fin met chaque interpolation sur sa dernière valeur ; ces
      // dernières valeurs doivent être l'état d'arrivée, et non celui d'avant le bilan.
      for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts]) {
        const timeline = buildTimeline(summary);
        const last = summary.imported[summary.imported.length - 1];

        assert.equal(timeline.counter.input[timeline.counter.input.length - 1], timeline.duration);
        assert.equal(
          timeline.counter.output[timeline.counter.output.length - 1],
          summary.totals?.xpAwarded,
        );

        for (const attribute of ATTRIBUTES) {
          const ramp = timeline.attributes[attribute];
          assert.equal(ramp.input[ramp.input.length - 1], timeline.duration);
          assert.equal(ramp.output[ramp.output.length - 1], last.attributes[attribute].after);
        }
      }
    });

    it('tient l\'écran assez longtemps pour se lire', () => {
      for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts]) {
        const timeline = buildTimeline(summary);
        const recap = timeline.beats.find((beat) => beat.kind === 'recap');
        assert.ok(recap !== undefined);

        // Deux secondes pleines : c'est aussi le délai avant que « Toucher pour continuer »
        // ne paraisse, puisque l'affordance suit la fin de la séquence.
        assert.ok(
          recap.until - recap.at >= 2_000,
          `le bilan ne tient que ${recap.until - recap.at}ms`,
        );
      }
    });
  });

  it('condense au-delà de trois workouts au lieu de jouer une minute et demie', () => {
    const timeline = buildTimeline(quinzeWorkouts);
    const sessions = timeline.beats.filter((beat) => beat.kind === 'session');
    const digest = timeline.beats.find((beat) => beat.kind === 'digest');

    assert.equal(sessions.length, DETAILED_WORKOUTS, 'trois séances en détail');
    assert.ok(digest !== undefined, 'et un condensé pour le reste');
    assert.equal(digest.count, quinzeWorkouts.imported.length - DETAILED_WORKOUTS);
    assert.equal(digest.from, DETAILED_WORKOUTS);

    // Rien n'est tronqué : le condensé porte les niveaux franchis par les douze autres.
    const condensedLevels = quinzeWorkouts.imported
      .slice(DETAILED_WORKOUTS)
      .flatMap((workout) => workout.level.reached);
    assert.deepEqual(digest.levels, condensedLevels);

    // Le budget a bougé avec #226 : les trois séances détaillées de cette fixture font
    // tomber du loot et des pièces (voir `avecLoot` et le workout condensé n°14), et ce
    // temps-là est légitime — c'est celui d'un titre, l'échelle du design system. Ce que le
    // budget continue de garder, c'est que le **condensé**, lui, ne rejoue toujours rien.
    assert.ok(
      timeline.duration < 24_000,
      `quinze séances doivent tenir sous vingt-quatre secondes, pas ${timeline.duration}ms`,
    );
  });

  it('ne condense rien quand tout tient dans le détail', () => {
    for (const summary of [unWorkout, troisWorkouts]) {
      const timeline = buildTimeline(summary);
      assert.equal(
        timeline.beats.some((beat) => beat.kind === 'digest'),
        false,
      );
    }
  });

  it('finit exactement sur `totals` — c\'est l\'état que le saut atteint', () => {
    for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts]) {
      const timeline = buildTimeline(summary);
      const last = timeline.counter.output[timeline.counter.output.length - 1];

      assert.equal(last, summary.totals?.xpAwarded);
      assert.deepEqual(timeline.totals, summary.totals);
    }
  });

  it('tient debout quand rien n\'a été crédité', () => {
    // `totals` vaut `null` : il n'y a pas d'état d'arrivée quand rien n'est arrivé. Le client
    // ne doit ni inventer un zéro, ni casser.
    assert.equal(toutEcarte.totals, null);
    assert.equal(toutEcarte.imported.length, 0);

    const timeline = buildTimeline(toutEcarte);

    assert.equal(timeline.totals, null);
    assert.equal(
      timeline.beats.some((beat) => beat.kind === 'session'),
      false,
      'aucune séance à jouer',
    );
    assert.ok(
      timeline.beats.some((beat) => beat.kind === 'skipped'),
      'mais les écarts se montrent',
    );
    assert.equal(timeline.counter.output[timeline.counter.output.length - 1], 0);
  });

  it('nomme chaque écart plutôt que de les compter', () => {
    // Le contrat rend `externalId`, `activityType` et `reason` par séance écartée : de quoi
    // dire « le curling n'est pas encore un sport chez nous » au lieu de « 1 séance ignorée ».
    const reasons = toutEcarte.skipped.map((entry) => entry.reason);

    assert.ok(reasons.includes('ALREADY_IMPORTED'));
    assert.ok(reasons.includes('UNSUPPORTED_ACTIVITY'));
    assert.ok(reasons.includes('TOO_SHORT'));
    assert.ok(reasons.includes('OUT_OF_WINDOW'));
    assert.ok(toutEcarte.skipped.every((entry) => entry.activityType.length > 0));
  });

  it('montre les écarts en dernier : un refus ne commence pas un écran', () => {
    const summary: SyncSummary = {
      ...troisWorkouts,
      skipped: toutEcarte.skipped,
    };
    const timeline = buildTimeline(summary);

    const skipped = timeline.beats.find((beat) => beat.kind === 'skipped');
    const lastSession = timeline.beats.filter((beat) => beat.kind === 'session').at(-1);

    assert.ok(skipped !== undefined && lastSession !== undefined);
    assert.ok(skipped.at > lastSession.at);
  });

  it("attend avant la première séance, sur le palier du joueur", () => {
    const timeline = buildTimeline(unWorkout);
    const first = timeline.beats[0];
    const session = timeline.beats.find((beat) => beat.kind === 'session');

    assert.ok(session !== undefined);
    assert.equal(first.kind, 'rest', "l'écran s'ouvre sur un temps mort, pas sur une séance");
    assert.ok(session.at > 0, "la séance ne commence pas à l'instant zéro");

    // Pendant l'attente, la barre ne bouge pas d'un pixel : elle montre ce que le joueur
    // avait. Sans ce palier, la première ligne serait un début et non un gain.
    const held = timeline.bar.input
      .map((at, index) => ({ at, fill: timeline.bar.output[index] }))
      .filter((point) => point.at <= session.at);

    assert.ok(held.length >= 2, "l'attente pose au moins deux points de barre");
    assert.ok(
      held.every((point) => point.fill === held[0].fill),
      'la barre tient sa valeur de départ pendant toute l’anticipation',
    );

    // Le premier bloc de détail occupe l'écran dès l'ouverture : l'anticipation lui appartient.
    assert.equal(timeline.segments[0].at, 0);
  });

  it("n'attend pas quand il n'y a rien à attendre", () => {
    // `tout-ecarte` ne crédite rien. Faire patienter devant une barre qui ne bougera jamais
    // ajouterait de la cérémonie à un refus.
    const timeline = buildTimeline(toutEcarte);

    assert.equal(timeline.totals, null);
    assert.equal(
      timeline.beats.filter((beat) => beat.kind === 'rest').length,
      1,
      'seul le temps de respirer final subsiste',
    );
  });

  it('allume la crête à chaque franchissement, condensé compris', () => {
    const timeline = buildTimeline(quinzeWorkouts);
    const flips = timeline.beats.filter((beat) => beat.kind === 'level');
    const digest = timeline.beats.find((beat) => beat.kind === 'digest');

    assert.ok(digest !== undefined && digest.levels.length > 0, 'le condensé porte des niveaux');
    assert.equal(
      timeline.crossings.length,
      flips.length + digest.levels.length,
      'un franchissement par niveau, où qu’il tombe',
    );

    // La crête culmine **à** l'ouverture du basculement, là où tombe aussi le choc haptique.
    for (const at of timeline.crossings) {
      assert.equal(timeline.crest.output[timeline.crest.input.indexOf(at)], 1);
    }

    // Et elle est éteinte partout ailleurs : c'est un éclat, pas un état.
    assert.equal(timeline.crest.output[0], 0);
    assert.equal(timeline.crest.output[timeline.crest.output.length - 1], 0);
  });

  it('produit des rampes que `interpolate` sait lire', () => {
    for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts, toutEcarte, avecLoot]) {
      const timeline = buildTimeline(summary);

      assertRampIsSane(timeline.bar, timeline.duration);
      assertRampIsSane(timeline.counter, timeline.duration);
      assertRampIsSane(timeline.purse, timeline.duration);
      assertRampIsSane(timeline.crest, timeline.duration);
      assertRampIsSane(timeline.attributes.strength, timeline.duration);
      assertRampIsSane(timeline.attributes.endurance, timeline.duration);
      assertRampIsSane(timeline.attributes.mobility, timeline.duration);
      assertRampIsSane(timeline.attributes.dexterity, timeline.duration);
      assertRampIsSane(timeline.attributes.vitality, timeline.duration);

      assert.ok(
        timeline.bar.output.every((fill) => fill >= 0 && fill <= 1),
        'la barre reste entre 0 et 1',
      );
    }
  });

  it('fait redescendre la barre sur une ligne négative au lieu de la lisser', () => {
    // `un-workout` porte un `DIMINISHING` négatif : les rendements décroissants doivent se
    // voir. Une barre qui ne ferait que monter mentirait sur ce que le jeu a décidé.
    const negative = unWorkout.imported[0].xp.breakdown.findIndex((line) => line.amount < 0);
    assert.ok(negative > 0, 'la fixture porte bien une ligne négative après une positive');

    const timeline = buildTimeline(unWorkout);
    const lines = timeline.beats.filter((beat) => beat.kind === 'xpLine');
    const at = (index: number) => timeline.bar.input.indexOf(lines[index].until);

    const before = timeline.bar.output[at(negative - 1)];
    const after = timeline.bar.output[at(negative)];

    assert.ok(after < before, `la barre doit reculer (${before} → ${after})`);
  });

  it('part du palier réel du joueur, pas de zéro', () => {
    const level = troisWorkouts.imported[0].level;
    const timeline = buildTimeline(troisWorkouts);

    const span = level.xpIntoLevelBefore + (level.xpToNextLevelBefore ?? 0);
    const expected = span === 0 ? 1 : level.xpIntoLevelBefore / span;

    assert.equal(timeline.bar.output[0], expected);
  });
});

describe('les cinq jauges de caractéristiques, entre le breakdown et le niveau', () => {
  it('posent un battement `attributes` après la dernière ligne du breakdown, avant le premier niveau', () => {
    const timeline = buildTimeline(troisWorkouts);

    troisWorkouts.imported.forEach((_, index) => {
      const lines = timeline.beats.filter((beat) => beat.kind === 'xpLine' && beat.workout === index);
      const attributesBeat = timeline.beats.find((beat) => beat.kind === 'attributes' && beat.workout === index);
      const firstLevel = timeline.beats.find((beat) => beat.kind === 'level' && beat.workout === index);

      assert.ok(attributesBeat !== undefined, `le workout ${index} porte un battement attributes`);
      if (lines.length > 0) {
        assert.ok(
          attributesBeat.at >= lines[lines.length - 1].until,
          'le battement suit la dernière ligne du breakdown',
        );
      }
      if (firstLevel !== undefined) {
        assert.equal(attributesBeat.until, firstLevel.at, 'et cède la place exactement au premier niveau');
      }
    });
  });

  it('laisse la barre tenir sa butée pendant tout le battement, sans la vider', () => {
    // Le défaut : le battement des jauges ne posait **aucun** point de barre. Entre le repos
    // de lecture qui le précède et le zéro de la bascule qui le suit, `interpolate` ne connaît
    // pas les beats — elle tire une droite. La barre se vidait donc lentement pendant les
    // ~1,8 s du cercle, et la bascule ne faisait plus retomber une barre pleine : elle
    // rattrapait une barre déjà vide, sous un or de crête allumé sur du néant.
    //
    // Ce test échantillonne la rampe comme le fait le composant, pas seulement à ses points :
    // c'est entre eux que le défaut vivait.
    for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts, avecLoot]) {
      const timeline = buildTimeline(summary);

      for (const beat of timeline.beats) {
        if (beat.kind !== 'attributes') continue;

        const departure = fillAt(timeline.bar, beat.at);
        for (const at of [beat.at, (beat.at + beat.until) / 2, beat.until]) {
          assert.equal(
            fillAt(timeline.bar, at),
            departure,
            `la barre a bougé à ${at} pendant le battement ${beat.at}-${beat.until}`,
          );
        }
      }
    }
  });

  it("n'en pose aucun quand rien n'a été crédité", () => {
    const timeline = buildTimeline(toutEcarte);
    assert.equal(
      timeline.beats.some((beat) => beat.kind === 'attributes'),
      false,
    );
  });

  it("enchaîne les cinq jauges sans discontinuité, d'un workout détaillé au suivant", () => {
    // Même invariant que la barre (grrind-back#79) : l'après du workout `i` est l'avant du
    // `i+1`, vérifié ici sur ce que la timeline en a effectivement tenu.
    for (const summary of [troisWorkouts, quinzeWorkouts]) {
      const timeline = buildTimeline(summary);
      const attributesBeats = timeline.beats.filter((beat) => beat.kind === 'attributes');

      for (let i = 1; i < attributesBeats.length; i += 1) {
        const previous = attributesBeats[i - 1];
        const current = attributesBeats[i];

        for (const attribute of ATTRIBUTES) {
          const ramp = timeline.attributes[attribute];
          const arrival = ramp.output[ramp.input.indexOf(previous.until)];
          const departure = ramp.output[ramp.input.indexOf(current.at)];

          assert.equal(departure, arrival, `${attribute} doit repartir d'où il s'est arrêté`);
        }
      }
    }
  });

  it('finissent exactement sur l’après du dernier workout crédité, condensé compris', () => {
    // Le piège du ticket : `SyncTotals` ne porte pas les caractéristiques. L'arrivée du
    // cercle, c'est l'`after` du dernier `imported` — jamais un total recalculé ici.
    for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts]) {
      const timeline = buildTimeline(summary);
      const last = summary.imported[summary.imported.length - 1];

      for (const attribute of ATTRIBUTES) {
        const ramp = timeline.attributes[attribute];
        assert.equal(ramp.output[ramp.output.length - 1], last.attributes[attribute].after);
      }
    }
  });

  it('un gain à zéro ne consomme aucun temps et reste éteint, jamais annoncé', () => {
    const summary: SyncSummary = {
      ...unWorkout,
      imported: [
        {
          ...unWorkout.imported[0],
          attributes: {
            ...unWorkout.imported[0].attributes,
            mobility: { gained: 0, before: 5, after: 5 },
          },
        },
      ],
    };

    const timeline = buildTimeline(summary);
    const attributesBeat = timeline.beats.find((beat) => beat.kind === 'attributes');
    assert.ok(attributesBeat !== undefined);

    // Trois gains non nuls (force, endurance, dextérité) : la mobilité, à zéro, ne consomme
    // aucun palier d'atterrissage. Le `dwell` (#79) est le temps de lecture de l'anneau une
    // fois posé — il ne dépend pas du nombre de gains, et c'est bien le point.
    assert.equal(
      attributesBeat.until - attributesBeat.at,
      3 * BEATS.attributeGain + BEATS.attributeSettle + BEATS.dwell,
    );

    const mobilityRamp = timeline.attributes.mobility;
    const duringTheBeat = mobilityRamp.input
      .map((at, index) => ({ at, value: mobilityRamp.output[index] }))
      .filter((point) => point.at >= attributesBeat.at && point.at <= attributesBeat.until);

    assert.ok(
      duringTheBeat.every((point) => point.value === 5),
      'la mobilité reste plate : rien à annoncer',
    );
  });
});

/**
 * Le loot, puis la bourse (#226) — le premier lot qui fait tomber quelque chose de plus qu'un
 * titre. `avecLoot` porte une vraie « Cape du voyageur » et des pièces ; `quinzeWorkouts` porte
 * l'objet du condensé, celui qu'on ne rejoue pas mais qu'on ne perd pas non plus.
 */
describe('le loot et la bourse, entre le titre et le streak (#226)', () => {
  it('joue loot puis coins juste après le dernier titre, et rien entre les deux', () => {
    const timeline = buildTimeline(avecLoot);
    const kinds = timeline.beats.map((beat) => beat.kind);

    const titleIndex = kinds.lastIndexOf('title');
    const lootIndex = kinds.indexOf('loot');
    const coinsIndex = kinds.indexOf('coins');

    assert.ok(
      titleIndex !== -1 && lootIndex !== -1 && coinsIndex !== -1,
      'les trois battements sont bien joués sur cette fixture',
    );
    assert.ok(lootIndex > titleIndex, 'le loot vient après le dernier titre');
    assert.equal(coinsIndex, lootIndex + 1, "rien ne sépare l'objet des pièces");

    // L'ordre complet du payload, tel qu'il est joué : xp, attributes, titre, loot, coins.
    const order = kinds.filter((kind) =>
      ['xpLine', 'attributes', 'title', 'loot', 'coins'].includes(kind),
    );
    assert.deepEqual(order, ['xpLine', 'xpLine', 'attributes', 'title', 'loot', 'coins']);
  });

  it('un tirage bredouille et une bourse à gain nul ne consomment aucun temps', () => {
    assert.ok(
      troisWorkouts.imported.every((workout) => workout.coins.gained > 0),
      'la fixture de départ fait bien tomber des pièces sur ses trois séances',
    );

    const bredouille: SyncSummary = {
      ...troisWorkouts,
      imported: troisWorkouts.imported.map((workout) => ({
        ...workout,
        loot: [],
        coins: { gained: 0, before: workout.coins.before, after: workout.coins.before },
      })),
    };

    const withoutLoot = buildTimeline(bredouille);
    const withLoot = buildTimeline(troisWorkouts);

    assert.equal(
      withoutLoot.beats.some((beat) => beat.kind === 'loot' || beat.kind === 'coins'),
      false,
      'aucun battement de loot ni de bourse posé',
    );
    // La séquence de départ, elle, tient plus longtemps : c'est exactement le temps que le
    // loot et la bourse lui coûtent sur les trois workouts.
    assert.ok(withoutLoot.duration < withLoot.duration);
  });

  it("enchaîne la bourse d'un workout au suivant sans jamais recalculer une valeur", () => {
    const timeline = buildTimeline(quinzeWorkouts);
    const coinsBeats = timeline.beats.filter(
      (beat): beat is Extract<Beat, { kind: 'coins' }> => beat.kind === 'coins',
    );

    // Les trois workouts détaillés de la fixture font tous tomber des pièces.
    assert.equal(coinsBeats.length, DETAILED_WORKOUTS);

    for (let i = 1; i < coinsBeats.length; i += 1) {
      assert.equal(
        coinsBeats[i].before,
        coinsBeats[i - 1].after,
        "l'après de l'un est l'avant du suivant, sans recalcul",
      );
    }

    // Et la timeline ne fait que reporter les valeurs du contrat, jamais les recomposer.
    coinsBeats.forEach((beat, index) => {
      const workout = quinzeWorkouts.imported[index];
      assert.equal(beat.before, workout.coins.before);
      assert.equal(beat.after, workout.coins.after);
      assert.equal(beat.gained, workout.coins.gained);
    });
  });

  it('ne perd aucun objet du condensé : il ne rejoue pas un par un, mais reste au bilan', () => {
    const timeline = buildTimeline(quinzeWorkouts);
    const condensedLoot = quinzeWorkouts.imported
      .slice(DETAILED_WORKOUTS)
      .flatMap((workout) => workout.loot);

    assert.ok(condensedLoot.length > 0, 'la fixture porte bien un objet tombé dans le condensé');
    assert.equal(
      timeline.beats.some((beat) => beat.kind === 'loot' && beat.workout >= DETAILED_WORKOUTS),
      false,
      'le condensé ne rejoue aucun objet un par un',
    );

    // Le budget du condensé ne déborde pas pour autant : c'est le bilan qui gagne du contenu,
    // pas la séquence — même borne que ci-dessus, celle que le loot des trois séances
    // détaillées a fait bouger, pas le condensé.
    assert.ok(
      timeline.duration < 24_000,
      `quinze séances doivent tenir sous vingt-quatre secondes, pas ${timeline.duration}ms`,
    );
  });

  it("la bourse du bilan ne bouge pas sur un lot où rien n'est tombé, même créditée en XP", () => {
    const summary: SyncSummary = {
      ...unWorkout,
      imported: [
        {
          ...unWorkout.imported[0],
          loot: [],
          coins: { gained: 0, before: 40, after: 40 },
        },
      ],
    };

    assert.ok(summary.imported[0].xp.breakdown.length > 0, "de l'XP a bien été créditée");

    const timeline = buildTimeline(summary);

    assert.equal(
      timeline.beats.some((beat) => beat.kind === 'coins'),
      false,
    );
    assert.ok(timeline.purse.output.every((value) => value === 40), 'la bourse reste plate');
    assert.equal(timeline.purse.output[timeline.purse.output.length - 1], 40);
  });
});
