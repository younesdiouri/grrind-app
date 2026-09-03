import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isCurrentReducedMotionRead } from './useReducedMotion.ts';

describe('la lecture de Réduire les animations', () => {
  it('ignore la lecture initiale quand un événement plus récent est déjà arrivé', () => {
    assert.equal(isCurrentReducedMotionRead(0, 1), false);
  });

  it('accepte la lecture initiale tant qu’aucun événement ne l’a dépassée', () => {
    assert.equal(isCurrentReducedMotionRead(0, 0), true);
  });
});
