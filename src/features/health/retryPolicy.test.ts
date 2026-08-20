import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { importTimeoutMsFor, retryDelaysFor } from './retryPolicy.ts';

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

describe("le budget de la requête d'import selon le déclencheur", () => {
  it("n'a pas de couperet en avant-plan : quelqu'un regarde", () => {
    assert.equal(importTimeoutMsFor('launch'), null);
    assert.equal(importTimeoutMsFor('foreground'), null);
    assert.equal(importTimeoutMsFor('manual'), null);
  });

  it("laisse dix secondes au réveil, sous le chien de garde natif de 25 s", () => {
    assert.equal(importTimeoutMsFor('background'), 10_000);
  });
});
