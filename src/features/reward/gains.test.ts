import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { batchGains } from './gains.ts';
import type { SyncSummary } from './timeline.ts';

const fixture = (name: string): SyncSummary =>
  JSON.parse(readFileSync(`fixtures/sync-summary/${name}.json`, 'utf8')) as SyncSummary;

describe('batchGains', () => {
  it('fait courir la barre sur tous les niveaux franchis du lot', () => {
    const gains = batchGains(fixture('trois-workouts'));
    assert.equal(gains.bar.start, 0);
    assert.equal(Math.floor(gains.bar.end), 2);
    assert.equal(gains.coins.before, 0);
    assert.equal(gains.coins.after, 32);
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

  it('nomme la raison d’un lot crédité sans XP', () => {
    assert.equal(batchGains(fixture('marche-sans-xp')).noCredit, 'NO_XP_FEEDS_VITALITY');
  });
});
