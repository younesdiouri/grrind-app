import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OFFLINE, type Failure, type ProblemDetails } from '@/features/auth/problems';
import { isGuildGone } from './guildRefresh.ts';

function problem(type: ProblemDetails['type']): Failure {
  return { kind: 'problem', problem: { type, title: 'x', status: 0, detail: 'x' } };
}

describe('la guilde qui a disparu pendant qu’on la regardait', () => {
  it('reconnaît guild-not-found, et lui seul', () => {
    assert.equal(isGuildGone(problem('https://grrind.app/problems/guild-not-found')), true);
  });

  it('ne confond pas avec un joueur introuvable, refus voisin mais différent', () => {
    assert.equal(isGuildGone(problem('https://grrind.app/problems/player-not-found')), false);
  });

  it('reste faux hors ligne : on ne sait rien de la guilde, on ne l’efface pas', () => {
    assert.equal(isGuildGone(OFFLINE), false);
  });
});
