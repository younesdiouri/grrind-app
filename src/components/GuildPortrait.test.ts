import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { components } from '@/api/schema';
import { GuildPortrait } from '@/components/GuildPortrait';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar';

const member: components['schemas']['GuildMember'] = {
  id: 'nora', displayName: 'Nora des montagnes', role: 'MEMBER', level: 1, appearance: 'STRENGTH_V3',
  avatar: { ...DEFAULT_AVATAR, body: 'female', hairStyle: 'ponytail', skinTone: 'deep' },
  league: { tier: 'DIAMOND', tierOrder: 4, lootLuckPercent: 20 },
  headEquipment: { key: 'BANDEAU_ECLAIR', artworkVersion: null },
  accessoryEquipment: { key: 'LES_CYCLOPES', artworkVersion: null },
  registeredAt: '2026-08-01T00:00:00Z', joinedAt: '2026-09-01T00:00:00Z',
  xpIntoLevel: 0, xpToNextLevel: 100, title: null,
  attributes: { strength: 0, endurance: 0, mobility: 0, dexterity: 0, vitality: 0 },
  vitalityBreakdown: { windowAverageActiveKcal: 0, targetActiveKcal: 500, bonusPermille: 0 },
};

test('le repli web garde les initiales et le nom accessible avec la vraie coiffe et la ligue serveur, indépendamment du niveau', () => {
  const html = renderToStaticMarkup(createElement(GuildPortrait, { member }));
  assert.match(html, /Portrait de Nora des montagnes · Ligue Diamant · Bandeau éclair · Les Cyclopes/);
  assert.match(html, />ND</);
  const bare = renderToStaticMarkup(createElement(GuildPortrait, { member: { ...member, headEquipment: null, accessoryEquipment: null,
    league: { tier: 'BRONZE', tierOrder: 0, lootLuckPercent: 0 } } }));
  assert.match(bare, /Portrait de Nora des montagnes · Ligue Bronze/);
  assert.doesNotMatch(bare, /Bandeau éclair/);
  assert.doesNotMatch(bare, /Les Cyclopes/);
});
