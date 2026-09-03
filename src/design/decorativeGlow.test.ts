import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { glow } from './tokens.ts';
import { decorativeGlow, type DecorativeGlow } from './decorativeGlow.ts';

/** Le compilateur est le seul endroit où les couples impossibles se prouvent. */
function assertGlowTypes() {
  const soft = decorativeGlow('soft', false);
  const exactSoft: DecorativeGlow<'soft'> = soft;
  const anyTier: DecorativeGlow = soft;

  void exactSoft;
  void anyTier;

  // @ts-expect-error Le vert ne peut pas se faire passer pour le tier cyan.
  const incoherent: DecorativeGlow = { tier: 'soft', effect: glow.lit };
  // @ts-expect-error Un appelant ne peut pas changer le tier après sa résolution.
  soft.tier = 'lit';
  // @ts-expect-error Un appelant ne peut pas allumer un effet après Réduire les animations.
  decorativeGlow('soft', true).effect = glow.soft;

  void incoherent;
}

void assertGlowTypes;

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
