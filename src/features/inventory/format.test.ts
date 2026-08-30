import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { components } from '@/api/schema';
import { formatModifier } from './format.ts';

type DroppedItemModifier = components['schemas']['DroppedItemModifier'];

function modifier(overrides: Partial<DroppedItemModifier>): DroppedItemModifier {
  return { type: 'XP_MULTIPLIER', value: 8, discipline: null, ...overrides };
}

describe('formatModifier — les pourcentages déjà résolus', () => {
  it('rend XP_MULTIPLIER en pourcentage entier', () => {
    assert.equal(formatModifier(modifier({ type: 'XP_MULTIPLIER', value: 8 })), 'XP +8 %');
  });

  it('rend LOOT_LUCK en pourcentage entier', () => {
    assert.equal(formatModifier(modifier({ type: 'LOOT_LUCK', value: 5 })), 'Chance de butin +5 %');
  });
});

describe('formatModifier — les bonus de caractéristique, en points d’XP répartis', () => {
  it('affiche la valeur brute, à l’échelle des jauges du cercle de vie', () => {
    assert.equal(
      formatModifier(modifier({ type: 'ENDURANCE_BONUS', value: 1200 })),
      'Endurance +1200',
    );
    assert.equal(
      formatModifier(modifier({ type: 'MOBILITY_BONUS', value: 1000 })),
      'Mobilité +1000',
    );
    assert.equal(formatModifier(modifier({ type: 'STRENGTH_BONUS', value: 4 })), 'Force +4');
    assert.equal(
      formatModifier(modifier({ type: 'DEXTERITY_BONUS', value: 12 })),
      'Dextérité +12',
    );
  });
});

describe('formatModifier — les points, déjà l’effet final', () => {
  it('n’applique aucune conversion à HP_BONUS et DAMAGE_BONUS', () => {
    assert.equal(formatModifier(modifier({ type: 'HP_BONUS', value: 140 })), 'Points de vie +140');
    assert.equal(formatModifier(modifier({ type: 'DAMAGE_BONUS', value: 16 })), 'Dégâts +16');
  });
});

describe('formatModifier — les millièmes, convertis en pourcentage à une décimale', () => {
  // Décision de ce ticket : un joueur ne lit pas « +180 ‰ », et le seul taux déjà montré
  // ailleurs (`EnemyCard`) est un pourcentage. La conversion est un choix d'affichage, elle
  // ne recalcule aucun taux de combat.
  it('convertit MITIGATION_BONUS', () => {
    assert.equal(formatModifier(modifier({ type: 'MITIGATION_BONUS', value: 180 })), 'Mitigation +18,0 %');
  });

  it('convertit EXTRA_TURN_BONUS', () => {
    assert.equal(
      formatModifier(modifier({ type: 'EXTRA_TURN_BONUS', value: 45 })),
      'Tour supplémentaire +4,5 %',
    );
  });

  it('convertit DODGE_BONUS, décimale comprise même à zéro', () => {
    assert.equal(formatModifier(modifier({ type: 'DODGE_BONUS', value: 30 })), 'Esquive +3,0 %');
  });
});

describe('formatModifier — les charges', () => {
  it('accorde le singulier à une charge', () => {
    assert.equal(formatModifier(modifier({ type: 'STREAK_SHIELD', value: 1 })), 'Bouclier de série +1 charge');
  });

  it('accorde le pluriel au-delà', () => {
    assert.equal(formatModifier(modifier({ type: 'STREAK_SHIELD', value: 3 })), 'Bouclier de série +3 charges');
  });
});

describe('formatModifier — l’effet sans grandeur connue', () => {
  // Aucun objet livré n'en porte : la valeur n'a pas d'unité documentée, et ce module refuse
  // de l'inventer plutôt que d'afficher un nombre qui ne voudrait rien dire.
  it('n’affiche que le nom de l’effet pour UNLOCK_SESSION_TYPE', () => {
    assert.equal(
      formatModifier(modifier({ type: 'UNLOCK_SESSION_TYPE', value: 1 })),
      'Nouveau type de séance',
    );
  });
});

describe('formatModifier — la portée', () => {
  it('ne dit rien quand l’effet s’applique partout', () => {
    assert.equal(
      formatModifier(modifier({ type: 'XP_MULTIPLIER', value: 5, discipline: null })),
      'XP +5 %',
    );
  });

  it('nomme la discipline sur la même ligne quand l’effet y est limité', () => {
    assert.equal(
      formatModifier(modifier({ type: 'XP_MULTIPLIER', value: 5, discipline: 'RUNNING' })),
      'XP +5 % · Course seulement',
    );
  });

  it('scope aussi un effet sans grandeur affichable', () => {
    assert.equal(
      formatModifier(modifier({ type: 'UNLOCK_SESSION_TYPE', value: 1, discipline: 'SWIMMING' })),
      'Nouveau type de séance · Natation seulement',
    );
  });
});
