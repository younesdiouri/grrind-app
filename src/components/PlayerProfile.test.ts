import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar.ts';
import { Button } from './Button.tsx';
import { PlayerProfile } from './PlayerProfile.tsx';

test('le profil public garde identité, défi et avatar seul, sans inventaire ni statistiques', () => {
  const markup = renderToStaticMarkup(createElement(PlayerProfile, {
    player: { displayName: 'Sam', title: null, level: 80, avatar: DEFAULT_AVATAR,
      league: { tier: 'BRONZE', tierOrder: 0, lootLuckPercent: 0 } },
    equipment: { HEAD: { key: 'BANDEAU_ECLAIR', artworkVersion: null },
      WEAPON: { key: 'FER_PLAY', artworkVersion: null } },
    action: createElement(Button, { label: 'Défier', onPress() {} }),
  }));
  assert.match(markup, /Ligue Bronze/);
  assert.equal([...markup.matchAll(/Niveau 80/g)].length, 1);
  assert.match(markup, /Défier/);
  assert.equal([...markup.matchAll(/role="button"/g)].length, 1);
  assert.doesNotMatch(markup, /Équipement|Sac|Statistiques|Voir le personnage en 3D|Vitalité|Progression du personnage/);
  assert.match(markup, /Portrait de Sam[^"<]*Bandeau éclair/);
});
