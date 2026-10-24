import assert from 'node:assert/strict';
import { test } from 'node:test';
import { combatEnemy, combatPlayer } from './combatCharacters.ts';
import duel from '../../../fixtures/battle/duel-equipped.json' with { type: 'json' };
import victory from '../../../fixtures/battle/victoire.json' with { type: 'json' };
import type { Battle } from './timeline.ts';

const duelBattle = duel as unknown as Battle;
const victoryBattle = victory as unknown as Battle;
const avatar: Battle['player']['avatar'] = { version: 1, body: 'female', faceStyle: 'original', noseStyle: 'original',
  hairStyle: 'long', skinTone: 'deep', eyeColor: 'green', hairColor: 'black' };
const equipment: NonNullable<Battle['player']['equipment']> = {
  CHEST: { key: 'SPORT_TSHIRT_CORAL', artworkVersion: null },
  LEGS: { key: 'LES_GUINZZ_CYAN', artworkVersion: null },
  WEAPON: { key: 'GOLDEN_BOXING_GLOVES', artworkVersion: null },
};

test('le joueur et le rival utilisent chacun leur avatar et les vêtements de leur snapshot', () => {
  const player = combatPlayer({ ...duelBattle.player, avatar, equipment });
  assert.equal(player.body, 'female');
  assert.equal(player.hairStyle, 'long');
  assert.equal(player.skinTone, 'deep');
  assert.equal(player.eyeColor, 'green');
  assert.equal(player.hairColor, 'black');
  assert.equal(player.faceStyle, 'original');
  assert.equal(player.sportShirt, true);
  assert.equal(player.shirtColor, 'coral');
  assert.equal(player.pantsColor, 'cyan');
  assert.equal(player.boxingGloves, true);
  assert.equal(player.boots, false);
  assert.equal(player.headband, false);
  const enemy = combatEnemy({ ...duelBattle.enemy, appearance: null, avatar, equipment });
  assert.deepEqual(enemy.avatar, player);
  assert.equal(enemy.artwork, undefined);
});

test('le pantalon équipé reste indépendant du haut et une arme retirée disparaît', () => {
  const player = combatPlayer({ ...duelBattle.player, avatar, equipment: { LEGS: equipment.LEGS } });
  assert.equal(player.sportShirt, false);
  assert.equal(player.pantsColor, 'cyan');
  assert.equal(player.boxingGloves, false);
  const shirtOnly = combatPlayer({ ...duelBattle.player, avatar, equipment: { CHEST: equipment.CHEST } });
  assert.equal(shirtOnly.sportShirt, true);
  assert.equal(shirtOnly.pantsColor, 'base');
});

test('les armes et leurs mouvements viennent du snapshot, même quand la famille ne suit pas la clé', () => {
  for (const key of ['FER_PLAY', 'HUILESSON']) {
    const battle = { ...duelBattle.player, equipment: { WEAPON: { key, artworkVersion: null, weaponType: 'SWORD' as const } } };
    const player = combatPlayer(battle);
    assert.equal(player.weapon, key === 'FER_PLAY' ? 'ferPlay' : 'huilesson');
    assert.equal(player.weaponType, 'SWORD');
    assert.equal(combatPlayer({ ...battle, equipment: { WEAPON: { ...battle.equipment.WEAPON, weaponType: 'FIST' } } }).weaponType, 'FIST');
  }
  assert.equal(combatPlayer(duelBattle.player).weaponType, 'FIST');
  assert.equal(combatPlayer({ ...duelBattle.player, equipment: {} }).weaponType, 'FIST');
});

test('un ancien snapshot reçoit le défaut V1 sans aucun équipement de démonstration', () => {
  const player = combatPlayer(duelBattle.player);
  assert.equal(player.body, 'male');
  assert.equal(player.faceStyle, 'square');
  assert.equal(player.noseStyle, 'wide');
  assert.equal(player.boxingGloves, false);
  assert.equal(player.boots, false);
  assert.equal(player.sportShirt, false);
});

test('une clé inconnue ou rangée dans le mauvais slot ne fabrique aucun objet Unity', () => {
  const player = combatPlayer({ ...duelBattle.player, avatar, equipment: {
    HEAD: { key: 'GOLDEN_BOXING_GLOVES', artworkVersion: null },
    FEET: { key: 'FUTURE_BOOTS', artworkVersion: null },
  } });
  assert.equal(player.boxingGloves, false);
  assert.equal(player.boots, false);
  assert.equal(player.headband, false);
});

test('le replay conserve les deux snapshots quand les apparences et équipements changent ensuite', () => {
  const armed = { ...equipment, WEAPON: { key: 'FER_PLAY', artworkVersion: null, weaponType: 'SWORD' as const } };
  const current: Battle = { ...duelBattle, player: { ...duelBattle.player, avatar, equipment: armed },
    enemy: { ...duelBattle.enemy, avatar: { ...avatar, body: 'male' as const, faceStyle: 'square' as const },
      equipment: { ...armed, WEAPON: { ...armed.WEAPON, key: 'HUILESSON' } } } };
  const replay = structuredClone(current);
  const before = { player: combatPlayer(replay.player), enemy: combatEnemy(replay.enemy) };
  assert.equal(before.player.weaponType, 'SWORD');
  assert.equal(before.enemy.avatar.weapon, 'huilesson');
  current.player.avatar.hairStyle = 'buzzed';
  current.player.equipment = {};
  current.enemy.avatar!.faceStyle = 'original';
  current.enemy.equipment = {};
  assert.deepEqual({ player: combatPlayer(replay.player), enemy: combatEnemy(replay.enemy) }, before);
  assert.notDeepEqual(combatPlayer(current.player), before.player);
  assert.notDeepEqual(combatEnemy(current.enemy), before.enemy);
});

test('les anciens duels utilisent un personnage Unity sans recharger les sprites du héros serveur', () => {
  const enemy = { ...duelBattle.enemy, appearance: 'STRENGTH_V3',
    imageUrls: { idle: 'https://old.test/idle.png', attack: 'https://old.test/attack.png', hit: 'https://old.test/hit.png' } };
  const presentation = combatEnemy(enemy);
  assert.equal(presentation.avatar.visible, true);
  assert.equal(presentation.artwork, undefined);
  assert.equal(enemy.appearance, 'STRENGTH_V3');
  assert.equal(enemy.name, duelBattle.enemy.name);
});

test('un mob sans modèle Unity garde son illustration et ne devient pas un adversaire humain', () => {
  const enemy = { ...victoryBattle.enemy, key: 'UNKNOWN_MOB', appearance: null };
  const local = { name: enemy.name, poses: { idle: { uri: 'mob-idle' }, attack: { uri: 'mob-attack' }, hit: { uri: 'mob-hit' } } };
  const presentation = combatEnemy(enemy, { [enemy.key!]: local });
  assert.equal(presentation.avatar.visible, false);
  assert.deepEqual(presentation.artwork?.poses, local.poses);
});

test('une illustration absente ne remplace jamais un monstre par un humain', () => {
  const presentation = combatEnemy({ ...victoryBattle.enemy, key: 'UNKNOWN_MOB', appearance: null, imageUrls: null });
  assert.equal(presentation.avatar.visible, false);
  assert.equal(presentation.artwork, undefined);
});

test('Cailloux utilise son modèle Unity par clé serveur, même avec un nom traduit et des anciens sprites', () => {
  const enemy = { ...victoryBattle.enemy, name: 'Pebble in your shoe', appearance: null };
  const before = structuredClone(enemy);
  const presentation = combatEnemy(enemy);
  assert.equal(presentation.avatar.visible, true);
  assert.equal(presentation.avatar.model, 'cailloux');
  assert.equal(presentation.artwork, undefined);
  assert.deepEqual(enemy, before);
});

test('le nom de Cailloux ne choisit jamais son modèle pour une autre clé ni un duel humain', () => {
  assert.equal(combatEnemy({ ...victoryBattle.enemy, key: 'UNKNOWN_MOB' }).avatar.model, undefined);
  assert.equal(combatEnemy({ ...duelBattle.enemy, key: 'SAND_JACKAL', appearance: 'STRENGTH_V3' }).avatar.model, undefined);
});
