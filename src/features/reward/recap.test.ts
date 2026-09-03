import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { recapCards } from './recap.ts';

describe('les cartes du bilan de synchronisation', () => {
  it('partage le budget entre titres et butin', () => {
    const recap = recapCards(['Premiers pas'], ['Gantelets de fer', 'Cape du voyageur']);

    assert.deepEqual(recap.titles, ['Premiers pas']);
    assert.deepEqual(recap.loot, ['Gantelets de fer']);
    assert.equal(recap.remainingTitles, 0);
    assert.equal(recap.remainingLoot, 1);
    assert.equal(recap.titles.length + recap.loot.length, 2);
  });

  it('compte chaque carte qu’il ne peut pas rendre', () => {
    const recap = recapCards(['Premier', 'Deuxième', 'Troisième'], ['Casque', 'Cape', 'Bottes']);

    assert.deepEqual(recap.titles, ['Premier', 'Deuxième']);
    assert.deepEqual(recap.loot, []);
    assert.equal(recap.remainingTitles, 1);
    assert.equal(recap.remainingLoot, 3);
  });
});
