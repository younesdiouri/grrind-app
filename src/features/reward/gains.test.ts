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

  it('additionne les caractéristiques créditées jusqu’à l’XP accordée', () => {
    const summary = fixture('quinze-workouts');
    const credited = batchGains(summary)
      .attributes.filter(({ attribute }) => attribute !== 'vitality')
      .reduce((sum, { gained }) => sum + gained, 0);
    assert.equal(credited, summary.totals?.xpAwarded);
  });

  it('ne rend rien quand rien n’a été crédité', () => {
    const gains = batchGains(fixture('tout-ecarte'));
    assert.equal(gains.totals, null);
    assert.deepEqual(gains.attributes, []);
  });

  it('fait courir la série de la première séance à la dernière, coffres compris', () => {
    const summary = fixture('quinze-workouts');
    const streak = batchGains(summary).streak;
    assert.deepEqual(streak?.before, summary.imported[0]?.streak.before);
    assert.deepEqual(streak?.after, summary.imported.at(-1)?.streak.after);
    assert.deepEqual(
      streak?.chests,
      summary.imported.flatMap((workout) => workout.streak.chests),
    );
  });

  it('tait la série quand aucun jour sportif n’a compté', () => {
    assert.equal(batchGains(fixture('marche-sans-xp')).streak, null);
  });

  it('nomme la raison d’un lot crédité sans XP', () => {
    assert.equal(batchGains(fixture('marche-sans-xp')).noCredit, 'NO_XP_FEEDS_VITALITY');
  });
});
