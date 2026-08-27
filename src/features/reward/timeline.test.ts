import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { BEATS, buildTimeline, DETAILED_WORKOUTS, type SyncSummary } from './timeline.ts';

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

const ATTRIBUTES: ('strength' | 'endurance' | 'mobility' | 'dexterity' | 'vitality')[] = [
  'strength',
  'endurance',
  'mobility',
  'dexterity',
  'vitality',
];

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

    assert.ok(
      timeline.duration < 20_000,
      `quinze séances doivent tenir sous vingt secondes, pas ${timeline.duration}ms`,
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
    for (const summary of [unWorkout, troisWorkouts, quinzeWorkouts, toutEcarte]) {
      const timeline = buildTimeline(summary);

      assertRampIsSane(timeline.bar, timeline.duration);
      assertRampIsSane(timeline.counter, timeline.duration);
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
