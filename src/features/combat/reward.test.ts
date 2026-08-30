import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { hasBattleReward, type BattleReward } from './reward.ts';
import type { Battle } from './timeline.ts';

/** Même idiome que `timeline.test.ts` : lues depuis le disque, pas par `import`, pour que
 *  `node --test` s'en sorte sans résoudre l'alias `@/` ni la clause `with { type: 'json' }`
 *  que Metro refuse. */
function fixture(name: string): BattleReward {
  const battle = JSON.parse(
    readFileSync(new URL(`../../../fixtures/battle/${name}.json`, import.meta.url), 'utf8'),
  ) as Battle;

  return battle.rewards;
}

describe('hasBattleReward', () => {
  it('dit vrai pour une victoire qui rapporte du loot et des pièces', () => {
    assert.equal(hasBattleReward(fixture('victoire-avec-loot')), true);
  });

  it('dit vrai pour une victoire qui ne rapporte que des pièces', () => {
    assert.equal(hasBattleReward(fixture('victoire')), true);
  });

  it("dit faux pour une défaite — `loot: []` et un gain nul, jamais une consolation", () => {
    assert.equal(hasBattleReward(fixture('defaite-boss')), false);
  });

  it('dit faux pour un combat long qui ne rapporte rien', () => {
    assert.equal(hasBattleReward(fixture('combat-long')), false);
  });
});
