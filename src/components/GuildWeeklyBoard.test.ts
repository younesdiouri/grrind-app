import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { components } from '@/api/schema';
import { GuildWeeklyBoard } from '@/components/GuildWeeklyBoard';
import { DEFAULT_AVATAR } from '@/features/combat/serverAvatar';

const member: components['schemas']['GuildMember'] = {
  id: 'amine', displayName: 'Amine', role: 'MEMBER', level: 5, appearance: 'STRENGTH_V3', avatar: DEFAULT_AVATAR,
  registeredAt: '2026-08-01T00:00:00Z', joinedAt: '2026-09-01T00:00:00Z',
  xpIntoLevel: 100, xpToNextLevel: 300, title: null,
  attributes: { strength: 0, endurance: 0, mobility: 0, dexterity: 0, vitality: 0 },
  vitalityBreakdown: { windowAverageActiveKcal: 0, targetActiveKcal: 500, bonusPermille: 0 },
};
const board: components['schemas']['GuildWeeklyLeaderboard'] = {
  guildId: 'guild', weekStartsAt: '2026-10-25T23:00:00Z', weekEndsAt: '2026-11-01T23:00:00Z', timezone: 'Europe/Paris',
  totalWorkouts: 12, activeMemberCount: 3,
  entries: [
    { member, workoutCount: 5, rank: 1 },
    { member: { ...member, id: 'sara', displayName: 'Sara' }, workoutCount: 5, rank: 1 },
    { member: { ...member, id: 'malik', displayName: 'Malik' }, workoutCount: 2, rank: 3 },
    { member: { ...member, id: 'nora', displayName: 'Nora' }, workoutCount: 0, rank: null },
  ],
};

test('le podium respecte les rangs serveur et les ex æquo, même au premier rang', () => {
  const markup = renderToStaticMarkup(createElement(GuildWeeklyBoard, { board, playerId: 'sara', onProfile() {} }));
  assert.match(markup, /Amine, 1er ex æquo, 5 séances/);
  assert.match(markup, /Sara, vous, 1er ex æquo, 5 séances/);
  assert.match(markup, /Malik, 3e, 2 séances/);
  assert.match(markup, /Nora, pas encore classé, 0 séance/);
  assert.match(markup, /12 séances/);
  assert.match(markup, /26 oct. — 1 nov./);
  assert.doesNotMatch(markup, /Nora, 4e|>2e</);
});

test('une semaine vide montre tous les membres sans couronner un vainqueur', () => {
  const empty = { ...board, totalWorkouts: 0, activeMemberCount: 0,
    entries: board.entries.map(entry => ({ ...entry, workoutCount: 0, rank: null })) };
  const markup = renderToStaticMarkup(createElement(GuildWeeklyBoard, { board: empty, playerId: 'nora', onProfile() {} }));
  assert.match(markup, /La semaine commence ici/);
  assert.doesNotMatch(markup, /guild-podium-/);
  assert.match(markup, /Nora, vous, pas encore classé, 0 séance/);
});

test('le rendu conserve un rang inhabituel et ne recalcule ni score ni total à partir de la liste', () => {
  const source = { ...board, totalWorkouts: 99, entries: [{ member, workoutCount: 17, rank: 7 }] };
  const markup = renderToStaticMarkup(createElement(GuildWeeklyBoard, { board: source, playerId: 'amine', onProfile() {} }));
  assert.match(markup, /99 séances/);
  assert.match(markup, /Amine, vous, 7e, 17 séances/);
  assert.deepEqual(source.entries[0], { member, workoutCount: 17, rank: 7 });
});
