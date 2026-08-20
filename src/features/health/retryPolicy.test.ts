import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { retryDelaysFor } from './retryPolicy.ts';

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
