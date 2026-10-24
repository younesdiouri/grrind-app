import assert from 'node:assert/strict';
import { test } from 'node:test';
import { combatEnemy } from './combatCharacters.ts';
import duel from '../../../fixtures/battle/duel-equipped.json' with { type: 'json' };
import victory from '../../../fixtures/battle/victoire.json' with { type: 'json' };
import type { Battle } from './timeline.ts';

const duelBattle = duel as unknown as Battle;
const victoryBattle = victory as unknown as Battle;

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
