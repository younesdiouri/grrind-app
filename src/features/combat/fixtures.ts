import combatLong from '@/../fixtures/battle/combat-long.json';
import duel from '@/../fixtures/battle/duel-equipped.json';
import defaiteBoss from '@/../fixtures/battle/defaite-boss.json';
import victoire from '@/../fixtures/battle/victoire.json';
import victoireAvecLoot from '@/../fixtures/battle/victoire-avec-loot.json';

import type { Battle } from './timeline.ts';

/** Réponses réelles v2 capturées sur le backend local le 8 septembre 2026.
 * Voir fixtures/battle/README.md. Les imports JSON élargissent les unions en string. */
export const BATTLE_FIXTURES = {
  duel: duel as unknown as Battle,
  victoire: victoire as unknown as Battle,
  victoireAvecLoot: victoireAvecLoot as unknown as Battle,
  defaiteBoss: defaiteBoss as unknown as Battle,
  combatLong: combatLong as unknown as Battle,
} as const;

export type BattleFixtureName = keyof typeof BATTLE_FIXTURES;

/** Défi de présentation : seule l’identité affichée change, la chronologie capturée reste intacte. */
export const DEMO_DUEL: Battle = { ...BATTLE_FIXTURES.duel,
  enemy: { ...BATTLE_FIXTURES.duel.enemy, name: 'Rival d’entraînement' } };

/** Synthetic cosmetic snapshots over the captured timeline; no game values are changed. */
export const AVATAR_DUEL: Battle = { ...BATTLE_FIXTURES.duel,
  player: { ...BATTLE_FIXTURES.duel.player,
    avatar: { version: 1, body: 'male', faceStyle: 'original', noseStyle: 'wide', hairStyle: 'buzzed',
      skinTone: 'brown', eyeColor: 'blue', hairColor: 'black' },
    equipment: { CHEST: { key: 'SPORT_TSHIRT_CORAL', artworkVersion: null },
      LEGS: { key: 'LES_GUINZZ_CYAN', artworkVersion: null } } },
  enemy: { ...BATTLE_FIXTURES.duel.enemy,
    avatar: { version: 1, body: 'female', faceStyle: 'original', noseStyle: 'original', hairStyle: 'long',
      skinTone: 'light', eyeColor: 'green', hairColor: 'blond' },
    equipment: { LEGS: { key: 'LES_GUINZZ_PURPLE', artworkVersion: null },
      WEAPON: { key: 'GOLDEN_BOXING_GLOVES', artworkVersion: null } } } };

export const WEIGHT_DUEL: Battle = { ...AVATAR_DUEL,
  player: { ...AVATAR_DUEL.player, equipment: { ...AVATAR_DUEL.player.equipment,
    WEAPON: { key: 'LE_POIDS_LOURD', artworkVersion: null } } },
  enemy: { ...AVATAR_DUEL.enemy, equipment: { ...AVATAR_DUEL.enemy.equipment,
    WEAPON: { key: 'LE_POIDS_LOURD', artworkVersion: null } } } };

export const WEAPONS_DUEL: Battle = { ...AVATAR_DUEL,
  player: { ...AVATAR_DUEL.player, equipment: { ...AVATAR_DUEL.player.equipment,
    WEAPON: { key: 'FER_PLAY', artworkVersion: null, weaponType: 'SWORD' } } },
  enemy: { ...AVATAR_DUEL.enemy, equipment: { ...AVATAR_DUEL.enemy.equipment,
    WEAPON: { key: 'HUILESSON', artworkVersion: null, weaponType: 'SWORD' } } } };
