import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_AVATAR, serverAvatar } from '@/features/combat/serverAvatar.ts';
import { previewConfiguration } from './previewConfiguration.ts';

test('le portrait cadre la tête personnalisée avec sa coiffe, sans arme ni tenue équipée', () => {
  for (const body of ['male', 'female'] as const) {
    const saved = { ...DEFAULT_AVATAR, body, hairStyle: 'long' as const, skinTone: 'deep' as const };
    const equipped = { ...serverAvatar(saved), headband: true, boxingGloves: true, dumbbell: true,
      weapon: 'ferPlay' as const, shirtColor: 'coral' as const };
    const config = previewConfiguration(equipped, { width: 128, height: 128 }, 'portrait');
    assert.equal(config.view, 1);
    assert.equal(config.azimuth, 0);
    assert.deepEqual(config.player, { ...serverAvatar(saved), headband: true });
    assert.equal(config.enemy.visible, false);
    assert.equal(config.previewWidth, 410);
    assert.equal(config.previewHeight, 410);
    assert.equal(equipped.headband, true);
  }
});

test('l’inspection en pied conserve son équipement et son cadrage existant', () => {
  const equipped = { ...serverAvatar(DEFAULT_AVATAR), headband: true, dumbbell: true };
  const config = previewConfiguration(equipped, { width: 200, height: 320 });
  assert.equal(config.player, equipped);
  assert.equal(config.view, 0);
  assert.equal(config.azimuth, 25);
});
