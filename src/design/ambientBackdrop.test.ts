import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldAnimateBackdrop } from './ambientBackdrop.ts';

describe('le mouvement du fond ambiant', () => {
  it('ne démarre que lorsque la préférence est connue et autorise le mouvement', () => {
    assert.equal(shouldAnimateBackdrop(false, true), true);
    assert.equal(shouldAnimateBackdrop(true, true), false);
    assert.equal(shouldAnimateBackdrop(null, true), false);
  });

  it('s’arrête lorsque l’application quitte le premier plan', () => {
    assert.equal(shouldAnimateBackdrop(false, false), false);
  });
});
