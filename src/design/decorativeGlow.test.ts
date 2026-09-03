import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { glow } from './tokens.ts';
import { decorativeGlow } from './decorativeGlow.ts';

describe('les halos décoratifs', () => {
  it('conserve les trois intensités comme vocabulaire fermé', () => {
    assert.equal(decorativeGlow('soft', false), glow.soft);
    assert.equal(decorativeGlow('lit', false), glow.lit);
    assert.equal(decorativeGlow('flare', false), glow.flare);
  });

  it('disparaît avec la préférence système sans masquer la couleur sémantique', () => {
    assert.equal(decorativeGlow('soft', true), undefined);
  });

  it('reste coupé tant que la préférence système est inconnue ou inaccessible', () => {
    assert.equal(decorativeGlow('soft', null), undefined);
  });
});
