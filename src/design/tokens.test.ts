import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ambientMotion,
  attributeColor,
  color,
  fontFamily,
  frame,
  glow,
  palette,
  radius,
  rarityColor,
  stroke,
} from './tokens.ts';

describe('les rôles de la palette néon froide', () => {
  it('conserve une teinte propre à chaque rôle sémantique', () => {
    assert.equal(color.accent, palette.ember);
    assert.equal(color.celebrate, palette.gold);
    assert.equal(color.gain, palette.mint);
    assert.equal(color.loss, palette.rust);
    assert.equal(color.coin, palette.copper);
    assert.equal(new Set([color.accent, color.celebrate, color.gain, color.loss, color.coin]).size, 5);
  });

  it('associe le blanc incandescent au légendaire seulement', () => {
    assert.equal(rarityColor.LEGENDARY, color.celebrate);
    assert.notEqual(rarityColor.EPIC, color.celebrate);
  });

  it('garde les quatre caractéristiques distinctes et les halos typés', () => {
    assert.equal(new Set(Object.values(attributeColor)).size, 4);
    assert.ok(glow.soft.boxShadow.includes(palette.cyanHalo));
    assert.ok(glow.lit.boxShadow.includes(palette.gainHalo));
    assert.ok(glow.flare.boxShadow.includes(palette.celebrateHalo));
  });

  it('définit les tokens tactiques de typographie display, traits, cadres et mouvement ambiant', () => {
    assert.equal(fontFamily.display, 'Oxanium-SemiBold');
    assert.equal(fontFamily.displayBold, 'Oxanium-Bold');
    assert.equal(fontFamily.displayRegular, 'Oxanium-Regular');

    assert.ok(stroke.hairline <= stroke.thin);
    assert.ok(stroke.thin < stroke.medium);
    assert.ok(stroke.medium < stroke.thick);

    assert.ok(frame.tier.standard.borderWidth > 0);
    assert.ok(frame.tier.hero.borderWidth >= frame.tier.standard.borderWidth);
    assert.ok(frame.tier.event.borderWidth >= frame.tier.hero.borderWidth);

    assert.ok(ambientMotion.cycleDuration >= 10000 && ambientMotion.cycleDuration <= 16000);
    assert.ok(radius.technical < radius.sm);
  });
});
