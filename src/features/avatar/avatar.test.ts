import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { components } from '@/api/schema';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar.ts';
import { avatarOptions, changeAvatar, normalizeAvatar } from './avatar.ts';

const both = ['male', 'female'] as const;
const option = (key: string, compatibleBodies: readonly ('male' | 'female')[] = both) => ({ key, compatibleBodies: [...compatibleBodies] });
const catalog: components['schemas']['AvatarCatalog'] = { version: 1, default: DEFAULT_AVATAR,
  headwear: { slot: 'HEAD', options: [] }, options: {
    body: [option('male', ['male']), option('female', ['female'])],
    faceStyle: [option('original'), option('square', ['male'])],
    noseStyle: [option('original'), option('wide', ['male'])],
    hairStyle: [option('parted'), option('buzzed'), option('buns'), option('long'), option('future-hair')],
    skinTone: [option('light'), option('tan'), option('brown'), option('deep')],
    eyeColor: [option('brown'), option('blue'), option('green')],
    hairColor: [option('brown'), option('black'), option('blond')],
  } };

test('un ancien compte sans apparence reprend exactement le défaut du catalogue', () => {
  assert.deepEqual(normalizeAvatar(undefined, catalog), catalog.default);
  assert.deepEqual(normalizeAvatar({ ...DEFAULT_AVATAR, version: 99 } as unknown as typeof DEFAULT_AVATAR, catalog), catalog.default);
});

test('le visage et le nez se choisissent indépendamment sur le pilote masculin', () => {
  const face = changeAvatar(DEFAULT_AVATAR, 'faceStyle', 'original', catalog);
  assert.equal(face.faceStyle, 'original');
  assert.equal(face.noseStyle, 'wide');
  const nose = changeAvatar(DEFAULT_AVATAR, 'noseStyle', 'original', catalog);
  assert.equal(nose.faceStyle, 'square');
  assert.equal(nose.noseStyle, 'original');
});

test('changer de corps remplace seulement les choix incompatibles, sans perdre les couleurs', () => {
  const before = { ...DEFAULT_AVATAR, skinTone: 'deep' as const, eyeColor: 'green' as const, hairColor: 'blond' as const };
  const female = changeAvatar(before, 'body', 'female', catalog);
  assert.equal(female.faceStyle, 'original');
  assert.equal(female.noseStyle, 'original');
  assert.equal(female.skinTone, 'deep');
  assert.equal(female.eyeColor, 'green');
  assert.equal(female.hairColor, 'blond');
  assert.deepEqual(before, { ...DEFAULT_AVATAR, skinTone: 'deep', eyeColor: 'green', hairColor: 'blond' });
});

test('les options affichées respectent le catalogue et les capacités de cette version Unity', () => {
  assert.deepEqual(avatarOptions(catalog, 'faceStyle', 'female'), ['original']);
  assert.deepEqual(avatarOptions(catalog, 'noseStyle', 'male'), ['original', 'wide']);
  assert.deepEqual(avatarOptions(catalog, 'hairStyle', 'male'), ['parted', 'buzzed', 'buns', 'long']);
});

test('un identifiant retiré reprend un choix compatible et un objet ajouté reste hors de l’avatar', () => {
  const value = { ...DEFAULT_AVATAR, hairStyle: 'retired', boxingGloves: true };
  const normalized = normalizeAvatar(value as unknown as typeof DEFAULT_AVATAR, catalog);
  assert.equal(normalized.hairStyle, catalog.default.hairStyle);
  assert.equal('boxingGloves' in normalized, false);
});
