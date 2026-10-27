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
    faceStyle: [option('original'), option('angular', ['male']), option('heart', ['female'])],
    noseStyle: [option('original'), option('wide', ['male']), option('button', ['female'])],
    hairStyle: [option('parted', ['male']), option('buns', ['female']), option('buzzed'), option('long', ['female']), option('future-hair')],
    skinTone: [option('light'), option('tan'), option('brown'), option('deep')],
    eyeColor: [option('brown'), option('blue'), option('green')],
    hairColor: [option('brown'), option('black'), option('blond')],
  } };

test('un ancien compte sans apparence reprend exactement le défaut du catalogue', () => {
  assert.deepEqual(normalizeAvatar(undefined, catalog), catalog.default);
  assert.deepEqual(normalizeAvatar({ ...DEFAULT_AVATAR, version: 99 } as unknown as typeof DEFAULT_AVATAR, catalog), catalog.default);
});

test('le visage et le nez se choisissent indépendamment', () => {
  const face = changeAvatar(DEFAULT_AVATAR, 'faceStyle', 'angular', catalog);
  assert.equal(face.faceStyle, 'angular');
  assert.equal(face.noseStyle, 'wide');
  const nose = changeAvatar(face, 'noseStyle', 'original', catalog);
  assert.equal(nose.faceStyle, 'angular');
  assert.equal(nose.noseStyle, 'original');
});

test('changer de corps remplace seulement les choix incompatibles, sans perdre les couleurs', () => {
  const before = { ...DEFAULT_AVATAR, skinTone: 'deep' as const, eyeColor: 'green' as const, hairColor: 'blond' as const };
  const female = changeAvatar({ ...before, faceStyle: 'angular' }, 'body', 'female', catalog);
  assert.equal(female.faceStyle, 'original');
  assert.equal(female.noseStyle, 'original');
  assert.equal(female.hairStyle, 'buns');
  assert.equal(female.skinTone, 'deep');
  assert.equal(female.eyeColor, 'green');
  assert.equal(female.hairColor, 'blond');
  assert.deepEqual(before, { ...DEFAULT_AVATAR, skinTone: 'deep', eyeColor: 'green', hairColor: 'blond' });
});

test('les options affichées respectent le catalogue et les capacités de cette version Unity', () => {
  assert.deepEqual(avatarOptions(catalog, 'faceStyle', 'female'), ['original', 'heart']);
  assert.deepEqual(avatarOptions(catalog, 'noseStyle', 'male'), ['original', 'wide']);
  assert.deepEqual(avatarOptions(catalog, 'hairStyle', 'male'), ['parted', 'buzzed']);
  assert.deepEqual(avatarOptions(catalog, 'hairStyle', 'female'), ['buns', 'buzzed', 'long']);
});

test('un identifiant retiré reprend un choix compatible et un objet ajouté reste hors de l’avatar', () => {
  const value = { ...DEFAULT_AVATAR, hairStyle: 'retired', boxingGloves: true };
  const normalized = normalizeAvatar(value as unknown as typeof DEFAULT_AVATAR, catalog);
  assert.equal(normalized.hairStyle, catalog.default.hairStyle);
  assert.equal('boxingGloves' in normalized, false);
});
