import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_AVATAR, serverAvatar } from './serverAvatar.ts';

const item = (key: string) => ({ key, artworkVersion: null });

test('Les Cyclopes viennent de ACCESSORY, se cumulent avec HEAD et disparaissent au retrait', () => {
  for (const body of ['male', 'female'] as const) {
    const avatar = { ...DEFAULT_AVATAR, body };
    const glasses = serverAvatar(avatar, { ACCESSORY: item('LES_CYCLOPES'), HEAD: item('MOUMOUTIVATION') });
    assert.equal(glasses.cyclopes, true);
    assert.equal(glasses.moumoutivation, true);
    assert.equal(glasses.headband, false);
    assert.equal(serverAvatar(avatar, { ACCESSORY: item('LES_CYCLOPES'), HEAD: item('BANDEAU_ECLAIR') }).headband, true);
    assert.equal(serverAvatar(avatar, { HEAD: item('LES_CYCLOPES') }).cyclopes, false);
    assert.equal(serverAvatar(avatar, { ACCESSORY: item('FUTURE_GLASSES') }).cyclopes, false);
    assert.equal(serverAvatar(avatar).cyclopes, false);
  }
});

test('la Moumoutivation vient de HEAD, remplace le bandeau et disparaît au retrait', () => {
  for (const body of ['male', 'female'] as const) {
    const avatar = { ...DEFAULT_AVATAR, body };
    const hat = serverAvatar(avatar, { HEAD: item('MOUMOUTIVATION') });
    assert.equal(hat.moumoutivation, true);
    assert.equal(hat.headband, false);
    assert.equal(serverAvatar(avatar, { HEAD: item('BANDEAU_ECLAIR') }).moumoutivation, false);
    assert.equal(serverAvatar(avatar, { WEAPON: item('MOUMOUTIVATION') }).moumoutivation, false);
    assert.equal(serverAvatar(avatar, { HEAD: item('FUTURE_HAT') }).moumoutivation, false);
    assert.equal(serverAvatar(avatar).moumoutivation, false);
  }
});

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
