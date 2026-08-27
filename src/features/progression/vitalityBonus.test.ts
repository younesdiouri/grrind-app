import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { explainVitality, formatBonusPermille } from './vitalityBonus.ts';

/**
 * La règle que ce banc garde est celle du ticket : **ne pas afficher le nombre seul**. Une
 * Vitality qui monte sans qu'aucune séance n'ait été créditée ne récompense rien tant qu'on ne
 * dit pas d'où elle vient — voir le docblock de `vitalityBonus.ts`.
 */
describe('le bonus de Vitality, rendu lisible', () => {
  it('traduit les millièmes en pourcentage, à la française', () => {
    assert.equal(formatBonusPermille(168), '+16,8 %');
  });

  it('retire la décimale quand elle ne dit rien', () => {
    // « +20,0 % » fait précis là où c'est rond.
    assert.equal(formatBonusPermille(200), '+20 %');
  });

  it('dit combien, et sur quoi le bonus est assis', () => {
    const explained = explainVitality({
      windowAverageActiveKcal: 420,
      targetActiveKcal: 500,
      bonusPermille: 168,
    });

    assert.ok(explained !== null);
    assert.equal(explained.bonus, '+16,8 %');
    // La moyenne est la mesure, la cible est le repère : sans elle, « 420 kcal » ne se compare
    // à rien.
    assert.match(explained.detail, /420/);
    assert.match(explained.detail, /500/);
  });

  it('n’annonce pas un bonus qui n’existe pas, et ne reproche rien', () => {
    const explained = explainVitality({
      windowAverageActiveKcal: 120,
      targetActiveKcal: 500,
      bonusPermille: 0,
    });

    assert.ok(explained !== null);
    assert.equal(explained.bonus, null, 'pas de « +0 % »');
    assert.match(explained.detail, /120/);
  });

  it('se tait devant une fenêtre entièrement vide', () => {
    // Une app installée le jour même n'a ni moyenne ni bonus. Lui parler d'une cible qu'elle
    // n'a pas eu le temps de viser serait lui reprocher d'être neuve.
    assert.equal(
      explainVitality({ windowAverageActiveKcal: 0, targetActiveKcal: 500, bonusPermille: 0 }),
      null,
    );
  });
});
