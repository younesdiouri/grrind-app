import combatLong from '@/../fixtures/battle/combat-long.json';
import defaiteBoss from '@/../fixtures/battle/defaite-boss.json';
import victoire from '@/../fixtures/battle/victoire.json';
import victoireAvecLoot from '@/../fixtures/battle/victoire-avec-loot.json';

import type { Battle } from './timeline.ts';

/** Réponses réelles v2 capturées sur le backend local le 8 septembre 2026.
 * Voir fixtures/battle/README.md. Les imports JSON élargissent les unions en string. */
export const BATTLE_FIXTURES = {
  victoire: victoire as unknown as Battle,
  victoireAvecLoot: victoireAvecLoot as unknown as Battle,
  defaiteBoss: defaiteBoss as unknown as Battle,
  combatLong: combatLong as unknown as Battle,
} as const;

export type BattleFixtureName = keyof typeof BATTLE_FIXTURES;
