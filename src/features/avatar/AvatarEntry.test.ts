import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar.ts';
import { AvatarEntry } from './AvatarEntry.tsx';

test('les entrées inventaire/réglages décrivent l’apparence enregistrée et ouvrent sa personnalisation', () => {
  const avatar = { ...DEFAULT_AVATAR, body: 'female' as const, faceStyle: 'original' as const,
    noseStyle: 'original' as const, hairStyle: 'long' as const, skinTone: 'deep' as const, hairColor: 'blond' as const };
  const markup = renderToStaticMarkup(createElement(AvatarEntry, { avatar, editable: true, onPress() {} }));
  assert.match(markup, /Femme/);
  assert.match(markup, /role="img"/);
  assert.match(markup, /Longs/);
  assert.match(markup, /Teint foncé/);
  assert.match(markup, /Cheveux blonds/);
  assert.match(markup, /Personnaliser mon apparence/);
  assert.doesNotMatch(markup, /Homme|Visage carré|Nez large|athlete\.png/);
});

test('le profil public propose uniquement la lecture du personnage et les vieux comptes ont un défaut', () => {
  const markup = renderToStaticMarkup(createElement(AvatarEntry, { onPress() {} }));
  assert.match(markup, /Homme/);
  assert.match(markup, /role="img"/);
  assert.match(markup, /Visage carré/);
  assert.match(markup, /Nez large/);
  assert.match(markup, /Voir le personnage en 3D/);
  assert.doesNotMatch(markup, /Personnaliser/);
});
