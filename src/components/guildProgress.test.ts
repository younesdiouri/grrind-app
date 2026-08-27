import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { components } from '@/api/schema';

import { progressFill } from './guildProgress.ts';

function member(
  overrides: Partial<components['schemas']['GuildMember']>,
): components['schemas']['GuildMember'] {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    displayName: 'Sam Petit',
    registeredAt: '2026-01-01T00:00:00Z',
    level: 4,
    xpIntoLevel: 0,
    xpToNextLevel: 100,
    title: null,
    attributes: { strength: 0, endurance: 0, mobility: 0, dexterity: 0, vitality: 0 },
    vitalityBreakdown: { windowAverageActiveKcal: 0, targetActiveKcal: 500, bonusPermille: 0 },
    role: 'MEMBER',
    joinedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

describe('le remplissage de la barre d’un membre', () => {
  it('divise l’XP acquise par la largeur du palier', () => {
    assert.equal(progressFill(member({ xpIntoLevel: 25, xpToNextLevel: 75 })), 0.25);
  });

  // `null` veut dire « niveau maximum » : il n'y a plus de palier, et un zéro dirait
  // « rien acquis » alors que c'est l'inverse — voir le contrat sur `Player.xpToNextLevel`.
  it('reste pleine au niveau maximum', () => {
    assert.equal(progressFill(member({ xpIntoLevel: 9999, xpToNextLevel: null })), 1);
  });

  it('ne plante pas sur un palier à largeur nulle', () => {
    assert.equal(progressFill(member({ xpIntoLevel: 0, xpToNextLevel: 0 })), 1);
  });
});
