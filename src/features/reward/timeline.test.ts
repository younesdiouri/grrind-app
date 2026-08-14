import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { buildTimeline, DETAILED_WORKOUTS, type SyncSummary } from './timeline.ts';

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
