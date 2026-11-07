import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { batchGains } from './gains.ts';
import type { SyncSummary } from './timeline.ts';

const fixture = (name: string): SyncSummary =>
  JSON.parse(readFileSync(`fixtures/sync-summary/${name}.json`, 'utf8')) as SyncSummary;

describe('batchGains', () => {
  it('fait courir la barre sur tous les niveaux franchis du lot', () => {
    const summary = fixture('trois-workouts');
    const gains = batchGains(summary);
    assert.equal(gains.bar.start, 0);
    assert.equal(Math.floor(gains.bar.end), 2);
    // La bourse se lit sur les soldes serveur — le tirage des pièces change d'une capture à l'autre.
    assert.equal(gains.coins.before, 0);
    assert.equal(gains.coins.after, summary.imported.at(-1)?.coins.after);
    assert.deepEqual(gains.titles.map((title) => title.name), ['Premiers pas']);
  });

  it('additionne les seuls deltas de caractéristiques rendus par le serveur', () => {
    const summary = fixture('quinze-workouts');
    const credited = batchGains(summary)
      .attributes.filter(({ attribute }) => attribute !== 'vitality')
      .reduce((sum, { gained }) => sum + gained, 0);
    assert.equal(credited, summary.imported.reduce((sum, workout) => sum + workout.attributes.strength.gained
      + workout.attributes.endurance.gained + workout.attributes.mobility.gained + workout.attributes.dexterity.gained, 0));
  });

  it('conserve l’XP et le niveau d’un import ancien sans remplir les jauges courantes', () => {
    const summary = fixture('un-workout');
    for (const workout of summary.imported) {
      for (const gauge of Object.values(workout.attributes)) {
        if ('gained' in gauge) gauge.gained = 0;
        gauge.before = 0; gauge.after = 0;
      }
    }
    const gains = batchGains(summary);
    assert.ok(gains.totals!.xpAwarded > 0);
    assert.deepEqual(gains.totals, summary.totals);
    assert.ok(gains.bar.end > gains.bar.start);
    assert.equal(gains.noCredit, null);
    assert.deepEqual(gains.attributes, []);
  });

  it('ne rend rien quand rien n’a été crédité', () => {
    const gains = batchGains(fixture('tout-ecarte'));
    assert.equal(gains.totals, null);
    assert.deepEqual(gains.attributes, []);
  });

  it('nomme la raison d’un lot crédité sans XP', () => {
    assert.equal(batchGains(fixture('marche-sans-xp')).noCredit, 'NO_XP_FEEDS_VITALITY');
  });
});
