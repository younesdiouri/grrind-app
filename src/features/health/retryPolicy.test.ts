import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { retryDelaysFor, runBudgetMsFor } from './retryPolicy.ts';

describe('la politique de rejeu selon le déclencheur', () => {
  it('rejoue trois fois pendant que quelqu\'un regarde l\'écran', () => {
    assert.deepEqual(retryDelaysFor('launch'), [400, 1200, 3000]);
    assert.deepEqual(retryDelaysFor('foreground'), [400, 1200, 3000]);
    assert.deepEqual(retryDelaysFor('manual'), [400, 1200, 3000]);
  });

  it('ne rejoue pas en arrière-plan : une requête, et on rend la main', () => {
    assert.deepEqual(retryDelaysFor('background'), []);
  });
});

describe('le budget de la course selon le déclencheur (#140)', () => {
  it("n'a pas de couperet en avant-plan : quelqu'un regarde", () => {
    assert.equal(runBudgetMsFor('launch'), null);
    assert.equal(runBudgetMsFor('foreground'), null);
    assert.equal(runBudgetMsFor('manual'), null);
  });

  it('couvre toute la course en arrière-plan — le GET, le refresh qu\'il peut déclencher et le POST —, sous le chien de garde natif de 25 s', () => {
    assert.equal(runBudgetMsFor('background'), 12_000);
  });
});
