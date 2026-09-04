import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { color, radius } from './tokens.ts';
import {
  computeFrameStyles,
  frameAccentColor,
  frameInnerAccentColor,
} from './systemFrame.ts';

describe('système de cadres tactiques (SystemFrame)', () => {
  it('calcule la hiérarchie standard par défaut', () => {
    const styles = computeFrameStyles();

    assert.equal(styles.outer.borderRadius, radius.sm);
    assert.equal(styles.outer.backgroundColor, color.surface);
    assert.equal(styles.inner.inset, 3);
    assert.equal(styles.accentSegment.length, 16);
  });

  it('augmente l’intensité sur le niveau hero et event', () => {
    const hero = computeFrameStyles('hero');
    const event = computeFrameStyles('event');

    assert.equal(hero.outer.borderRadius, radius.technical);
    assert.equal(event.outer.borderRadius, radius.technical);

    assert.ok(hero.accentSegment.length > 16);
    assert.ok(event.accentSegment.length > hero.accentSegment.length);
    assert.ok(event.accentSegment.width >= hero.accentSegment.width);
  });

  it('mappe fidèlement les accents sémantiques', () => {
    assert.equal(frameAccentColor('celebrate'), color.celebrate);
    assert.equal(frameAccentColor('gain'), color.gain);
    assert.equal(frameAccentColor('loss'), color.loss);
    assert.equal(frameAccentColor('danger'), color.danger);
    assert.equal(frameAccentColor('coin'), color.coin);
    assert.equal(frameAccentColor('accent'), color.accent);

    const accented = computeFrameStyles('event', 'celebrate');
    assert.equal(accented.outer.borderColor, color.celebrate);
    assert.equal(accented.accentSegment.color, color.celebrate);
    assert.ok(accented.inner.borderColor.startsWith('rgba('));
  });

  it('associe une doublure intérieure à chaque accent', () => {
    assert.ok(frameInnerAccentColor('accent').includes('53, 228, 255'));
    assert.ok(frameInnerAccentColor('gain').includes('117, 255, 178'));
    assert.ok(frameInnerAccentColor('loss').includes('255, 90, 205'));
  });
});
