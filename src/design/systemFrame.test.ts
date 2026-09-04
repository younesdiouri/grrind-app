import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { framePresentation } from './systemFrame.ts';

describe('les variantes de cadre système', () => {
  it('garde le cadre standard simple et discret', () => {
    const presentation = framePresentation('standard', 'accent');

    assert.equal(presentation.double, false);
    assert.equal(presentation.glow, false);
  });

  it('double les cadres héroïque et événementiel', () => {
    assert.equal(framePresentation('hero', 'celebrate').double, true);
    assert.equal(framePresentation('event', 'gain').double, true);
    assert.equal(framePresentation('event', 'gain').glow, true);
  });

  it('résout l’accent sans changer le rôle sémantique des couleurs', () => {
    assert.notEqual(
      framePresentation('hero', 'coin').accentColor,
      framePresentation('hero', 'celebrate').accentColor,
    );
  });
});
