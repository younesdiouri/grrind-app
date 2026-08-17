import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fillOf } from './guildCapacity.ts';

describe('la fraction d’une jauge de capacité', () => {
  it('divise l’effectif par la capacité', () => {
    assert.equal(fillOf(12, 30), 0.4);
    assert.equal(fillOf(30, 30), 1);
  });

  it('ne dépasse jamais 1, même sur une donnée incohérente', () => {
    assert.equal(fillOf(31, 30), 1);
  });

  // Une capacité à zéro ne devrait pas arriver au contrat, mais une division par zéro ne
  // doit pas faire planter l'écran pour autant.
  it('rend 0 plutôt que NaN sur une capacité à zéro', () => {
    assert.equal(fillOf(0, 0), 0);
  });
});
