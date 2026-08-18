import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { leaveAnnouncementFor } from './leaveAnnouncement.ts';

describe("l'annonce de « quitter » — trois issues sous un seul bouton", () => {
  it('un membre ordinaire part simplement, quel que soit le nombre de membres restants', () => {
    const announcement = leaveAnnouncementFor({
      role: 'MEMBER',
      memberCount: 12,
      guildName: 'Les Lève-Tôt',
    });

    assert.deepEqual(announcement, {
      kind: 'member',
      message: 'Tu quittes Les Lève-Tôt. Tu pourras revenir avec un code valide.',
    });
  });

  it('un fondateur avec des co-équipiers déclenche la succession, jamais un choix à faire', () => {
    const announcement = leaveAnnouncementFor({
      role: 'FOUNDER',
      memberCount: 5,
      guildName: 'Les Increvables',
    });

    assert.equal(announcement.kind, 'founder-succession');
  });

  // La frontière exacte du ticket : à deux membres, le fondateur en laisse un derrière lui,
  // donc succession — pas encore dissolution.
  it('un fondateur à deux membres reste sur la succession, pas la dissolution', () => {
    const announcement = leaveAnnouncementFor({
      role: 'FOUNDER',
      memberCount: 2,
      guildName: 'Les Increvables',
    });

    assert.equal(announcement.kind, 'founder-succession');
  });

  // L'autre frontière : seul, le fondateur ne laisse personne à qui transmettre.
  it('un fondateur seul dissout la guilde en partant', () => {
    const announcement = leaveAnnouncementFor({
      role: 'FOUNDER',
      memberCount: 1,
      guildName: 'Les Increvables',
    });

    assert.equal(announcement.kind, 'founder-dissolution');
  });
});
