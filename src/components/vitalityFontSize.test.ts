import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { vitalityFontSize } from './vitalityFontSize.ts';

describe('la taille du chiffre de Vitality', () => {
  it('reste à la taille maximale quand le chiffre tient large', () => {
    assert.equal(vitalityFontSize(5, 60, 56), 56);
  });

  it('rétrécit à mesure que Vitality gagne des chiffres', () => {
    assert.equal(vitalityFontSize(12345, 60, 56), 18);
    assert.equal(vitalityFontSize(1234567890, 60, 56), 9);
  });

  // Vitality n'a pas de plafond : trois chiffres aujourd'hui, cinq demain — le calcul doit
  // rester monotone, jamais un plateau ou une remontée surprise.
  it('ne remonte jamais quand Vitality gagne un chiffre de plus', () => {
    const threeDigits = vitalityFontSize(184, 60, 56);
    const fourDigits = vitalityFontSize(1840, 60, 56);
    const fiveDigits = vitalityFontSize(18400, 60, 56);

    assert.ok(threeDigits >= fourDigits);
    assert.ok(fourDigits >= fiveDigits);
  });

  it('compte les chiffres, jamais le signe', () => {
    assert.equal(vitalityFontSize(-5, 60, 56), vitalityFontSize(5, 60, 56));
  });

  it('traite zéro comme un seul chiffre', () => {
    assert.equal(vitalityFontSize(0, 60, 56), 56);
  });
});
