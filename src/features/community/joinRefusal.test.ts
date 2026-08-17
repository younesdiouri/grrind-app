import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OFFLINE, type Failure, type ProblemDetails } from '@/features/auth/problems';
import { joinRefusalFrom } from './joinRefusal.ts';

/**
 * Le banc des quatre refus de `POST /api/guilds/join` — le tableau du ticket #42.
 *
 * Il ne reprouve pas `messageFor` : celui-ci a son propre banc côté auth, et ce module ne
 * porte aucun texte. Il prouve seulement que chaque `type` du contrat tombe dans la bonne
 * mise en scène, `guild-is-full` avec sa `capacity` lue et pas inventée, et que tout le reste
 * — hors ligne compris — tombe dans `other` plutôt que de planter.
 */

function problem(type: ProblemDetails['type'], extra: Record<string, unknown> = {}): Failure {
  return {
    kind: 'problem',
    problem: { type, title: 'x', status: 0, detail: 'x', ...extra },
  };
}

describe('les refus de rejoindre une guilde', () => {
  it('un code inconnu, expiré ou révoqué tombe sous un seul type', () => {
    const refusal = joinRefusalFrom(problem('https://grrind.app/problems/invite-code-not-usable'));
    assert.deepEqual(refusal, { kind: 'invite-code-not-usable' });
  });

  it('un joueur déjà membre est distingué, pour proposer le retour vers sa guilde', () => {
    const refusal = joinRefusalFrom(problem('https://grrind.app/problems/player-already-in-a-guild'));
    assert.deepEqual(refusal, { kind: 'player-already-in-a-guild' });
  });

  it('une guilde complète porte sa capacité, lue et non codée en dur', () => {
    const refusal = joinRefusalFrom(
      problem('https://grrind.app/problems/guild-is-full', { capacity: 30 }),
    );
    assert.deepEqual(refusal, { kind: 'guild-is-full', capacity: 30 });
  });

  it('une capacité absente du problème ne se remplace pas par une valeur inventée', () => {
    const refusal = joinRefusalFrom(problem('https://grrind.app/problems/guild-is-full'));
    assert.deepEqual(refusal, { kind: 'guild-is-full', capacity: null });
  });

  it('le limiteur par joueur tombe sous son propre type', () => {
    const refusal = joinRefusalFrom(problem('https://grrind.app/problems/too-many-requests'));
    assert.deepEqual(refusal, { kind: 'too-many-requests' });
  });

  it("un refus hors du tableau retombe sur 'other' plutôt que de planter", () => {
    const refusal = joinRefusalFrom(problem('https://grrind.app/problems/validation-failed'));
    assert.deepEqual(refusal, { kind: 'other' });
  });

  it("l'absence de réseau retombe aussi sur 'other'", () => {
    assert.deepEqual(joinRefusalFrom(OFFLINE), { kind: 'other' });
  });
});
