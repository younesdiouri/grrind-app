import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ambient,
  attributeColor,
  color,
  control,
  glow,
  palette,
  rarityColor,
} from './tokens.ts';

describe('les rôles de la palette néon froide', () => {
  it('conserve une teinte propre à chaque rôle sémantique', () => {
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

  it('garde les contrôles presque rectangulaires et tactiles', () => {
    assert.ok(control.radius <= 2);
    assert.ok(control.minHeight >= 44);
  });

  it('borne le fond ambiant à quatre rails sur un cycle lent', () => {
    assert.ok(ambient.rails.length >= 2 && ambient.rails.length <= 4);
    assert.ok(ambient.cycle >= 10_000 && ambient.cycle <= 16_000);
  });
});
