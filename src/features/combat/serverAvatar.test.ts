import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_AVATAR, serverAvatar } from './serverAvatar.ts';

const item = (key: string) => ({ key, artworkVersion: null });

test('le Bandeau éclair porté en tête met le bandeau, une autre coiffe non (#306)', () => {
  assert.equal(serverAvatar(DEFAULT_AVATAR, { HEAD: item('BANDEAU_ECLAIR') }).headband, true);
  assert.equal(serverAvatar(DEFAULT_AVATAR, { HEAD: item('TEMPERED_HEADBAND') }).headband, false);
  assert.equal(serverAvatar(DEFAULT_AVATAR, { WEAPON: item('BANDEAU_ECLAIR') }).headband, false);
  assert.equal(serverAvatar(DEFAULT_AVATAR).headband, false);
});

test('les clés serveur choisissent tenue et arme, un emplacement vide rend la tenue de base', () => {
  const avatar = serverAvatar(DEFAULT_AVATAR, { CHEST: item('SPORT_TSHIRT_SLATE'), LEGS: item('LES_GUINZZ_CYAN'),
    WEAPON: item('GOLDEN_BOXING_GLOVES') });
  assert.deepEqual([avatar.shirtColor, avatar.pantsColor, avatar.boxingGloves, avatar.dumbbell], ['cyan', 'cyan', true, false]);
  const bare = serverAvatar(DEFAULT_AVATAR, {});
  assert.deepEqual([bare.shirtColor, bare.pantsColor, bare.boxingGloves, bare.weapon], ['base', 'base', false, undefined]);
});
