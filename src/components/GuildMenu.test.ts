import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { components } from '@/api/schema';
import { GuildMembers, GuildTabs } from '@/components/GuildMenu';
import { GuildRisalatSummary } from '@/components/GuildRisalatSummary';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar';

function member(id: string, level: number, role: 'FOUNDER' | 'MEMBER' = 'MEMBER'): components['schemas']['GuildMember'] {
  return { id, displayName: id, level, role, appearance: 'STRENGTH_V3', avatar: DEFAULT_AVATAR,
    registeredAt: '2026-09-01T00:00:00Z', joinedAt: '2026-10-01T00:00:00Z',
    xpIntoLevel: 100, xpToNextLevel: 300, title: null,
    attributes: { strength: 0, endurance: 0, mobility: 0, dexterity: 0, vitality: 0 },
    vitalityBreakdown: { windowAverageActiveKcal: 0, targetActiveKcal: 500, bonusPermille: 0 } };
}

test('les membres sont présentés par niveau sans modifier la réponse serveur ni privilégier le fondateur', () => {
  const members = [member('Fondateur', 2, 'FOUNDER'), member('Éclaireuse', 9), member('Rival', 7)];
  const markup = renderToStaticMarkup(createElement(GuildMembers, {
    members, canExclude: true, excludingId: null, onProfile() {}, onExclude() {},
  }));
  assert.ok(markup.indexOf('Éclaireuse') < markup.indexOf('Rival'));
  assert.ok(markup.indexOf('Rival') < markup.indexOf('Fondateur'));
  assert.deepEqual(members.map(m => m.id), ['Fondateur', 'Éclaireuse', 'Rival']);
  assert.match(markup, /aria-label="Exclure Éclaireuse"/);
  assert.doesNotMatch(markup, /aria-label="Exclure Fondateur"/);
  assert.doesNotMatch(markup, />Exclure</);
});

test('un membre ne reçoit pas de contrôle d’exclusion et une exclusion en cours bloque les autres', () => {
  const props = { members: [member('A', 4), member('B', 3)], excludingId: 'A', onProfile() {}, onExclude() {} };
  const regular = renderToStaticMarkup(createElement(GuildMembers, { ...props, canExclude: false }));
  assert.doesNotMatch(regular, /aria-label="Exclure/);
  const founder = renderToStaticMarkup(createElement(GuildMembers, { ...props, canExclude: true }));
  assert.match(founder, /aria-disabled="true"/);
});

test('les cinq destinations restent accessibles et Risālāt signale le tour sans ajouter de texte d’aide', () => {
  const markup = renderToStaticMarkup(createElement(GuildTabs, { selected: 'week', onSelect() {}, myTurn: true }));
  for (const tab of ['week', 'chat', 'members', 'risalat', 'settings']) assert.match(markup, new RegExp(`guild-tab-${tab}`));
  assert.match(markup, /Risālāt, c’est ton tour/);
  assert.match(markup, /aria-selected="true"/);
});

test('le résumé conserve chaque bonus serveur et distingue le tour personnel de celui d’un autre membre', () => {
  const first: components['schemas']['Risala'] = { id: 'first', discipline: 'RUNNING', senderId: 'a', senderDisplayName: 'Amine',
    bonusPercent: 150, revealedAt: '2026-10-25T19:00:00Z', expiresAt: '2026-11-08T19:00:00Z' };
  const risalat: components['schemas']['Risalat'] = { risalat: [first, { ...first, id: 'second', discipline: 'CYCLING', bonusPercent: 50 }],
    nextRevealAt: '2026-11-01T19:00:00Z', turn: { senderId: 'a', senderDisplayName: 'Amine', mine: true, discipline: null,
      deadline: '2026-11-01T19:00:00Z', choosable: ['SWIMMING'] } };
  const props = { risalat, now: new Date('2026-10-28T10:00:00Z'), onOpen() {} };
  const markup = renderToStaticMarkup(createElement(GuildRisalatSummary, props));
  assert.match(markup, /150.*% XP/);
  assert.match(markup, /50.*% XP/);
  assert.match(markup, /C’est ton tour/);
  const other = renderToStaticMarkup(createElement(GuildRisalatSummary, { ...props,
    risalat: { ...risalat, turn: { ...risalat.turn!, mine: false } } }));
  assert.doesNotMatch(other, /C’est ton tour/);
});
