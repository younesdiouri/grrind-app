import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import type { SyncSummary } from './timeline.ts';

/**
 * L'invariant du serveur sur `RewardSummary.attributes`, éprouvé sur les fixtures réelles.
 *
 * `AttributeGauge.gained` est le détail par caractéristique d'`xp.awarded` — leur somme sur
 * les quatre qui reçoivent de l'XP (Vitality est dérivée, jamais créditée) doit valoir
 * exactement ce total. Ce test ne protège pas le client d'un bug à lui : `buildTimeline` ne
 * touche pas encore `attributes` (#69 → #71). Il détecte que le **contrat a menti** — le seul
 * rôle qu'une donnée capturée peut jouer.
 *
 * Les fixtures se lisent depuis le disque, comme dans `timeline.test.ts` : `node --test`
 * efface les types mais ne résout pas l'alias `@/`, et ce banc n'a pas à connaître la
 * configuration de Metro pour lire quatre fichiers JSON.
 */
function fixture(name: string): SyncSummary {
  return JSON.parse(
    readFileSync(new URL(`../../../fixtures/sync-summary/${name}.json`, import.meta.url), 'utf8'),
  ) as SyncSummary;
}

const FIXTURE_NAMES = ['un-workout', 'trois-workouts', 'quinze-workouts', 'tout-ecarte'];

describe("l'invariant des caractéristiques sur un RewardSummary", () => {
  for (const name of FIXTURE_NAMES) {
    it(`${name} : la somme des \`gained\` vaut \`xp.awarded\`, workout par workout`, () => {
      const summary = fixture(name);

      for (const workout of summary.imported) {
        const { strength, endurance, mobility, dexterity } = workout.attributes;
        const sum = strength.gained + endurance.gained + mobility.gained + dexterity.gained;

        assert.equal(sum, workout.xp.awarded);
      }
    });
  }
});
