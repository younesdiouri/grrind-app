import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldAnimateBackdrop } from './ambientBackdropState.ts';

describe('décision d’activation du fond ambiant tactique', () => {
  it('désactive l’animation lorsque reducedMotion est actif', () => {
    assert.equal(shouldAnimateBackdrop(true, 'active'), false);
  });

  it('désactive l’animation tant que la préférence n’est pas résolue', () => {
    assert.equal(shouldAnimateBackdrop(null, 'active'), false);
  });

  it('désactive l’animation en arrière-plan pour économiser l’énergie', () => {
    assert.equal(shouldAnimateBackdrop(false, 'background'), false);
    assert.equal(shouldAnimateBackdrop(false, 'inactive'), false);
  });

  it('autorise l’animation uniquement en premier plan sans restriction d’accessibilité', () => {
    assert.equal(shouldAnimateBackdrop(false, 'active'), true);
  });
});
