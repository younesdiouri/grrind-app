import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attributeColor, color, glow, palette, rarityColor } from './tokens.ts';

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
});
