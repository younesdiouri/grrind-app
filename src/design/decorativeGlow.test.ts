import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { glow } from './tokens.ts';
import { decorativeGlow } from './decorativeGlow.ts';

describe('les halos décoratifs', () => {
  it('conserve les trois intensités comme vocabulaire fermé', () => {
    assert.deepEqual(decorativeGlow('soft', false), { tier: 'soft', effect: glow.soft });
    assert.deepEqual(decorativeGlow('lit', false), { tier: 'lit', effect: glow.lit });
    assert.deepEqual(decorativeGlow('flare', false), { tier: 'flare', effect: glow.flare });
  });

  it('disparaît avec la préférence système sans masquer la couleur sémantique', () => {
    assert.deepEqual(decorativeGlow('soft', true), { tier: 'soft', effect: undefined });
  });

  it('reste coupé tant que la préférence système est inconnue ou inaccessible', () => {
    assert.deepEqual(decorativeGlow('soft', null), { tier: 'soft', effect: undefined });
  });
});
