import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { OFFLINE, type Failure, type ProblemDetails } from '@/features/auth/problems';
import { turnRefusalFrom } from './turnRefusal.ts';

/**
 * Le banc des six refus de `PUT /api/guilds/mine/risalat/turn` — le tableau du ticket #106.
 *
 * Comme `joinRefusal.test.ts`, il ne reprouve pas `messageFor` : ce module ne porte aucun
 * texte, il ne prouve que la mise en scène choisie pour chaque `type` du contrat.
 */

function problem(type: ProblemDetails['type']): Failure {
  return { kind: 'problem', problem: { type, title: 'x', status: 0, detail: 'x' } };
}

describe('les refus de choisir une Risāla', () => {
  it("l'échéance passée ferme, elle ne se réessaie pas", () => {
    const refusal = turnRefusalFrom(problem('https://grrind.app/problems/risala-turn-is-closed'));
    assert.deepEqual(refusal, { kind: 'turn-closed' });
  });

  it("une discipline qui ne crédite plus dit que la liste est périmée", () => {
    const refusal = turnRefusalFrom(
      problem('https://grrind.app/problems/discipline-does-not-credit'),
    );
    assert.deepEqual(refusal, { kind: 'choosable-stale' });
  });

  it("une discipline déjà portée par une autre Risāla dit la même chose", () => {
    const refusal = turnRefusalFrom(
      problem('https://grrind.app/problems/discipline-already-challenged'),
    );
    assert.deepEqual(refusal, { kind: 'choosable-stale' });
  });

  it("plus de tour ouvert recule vers le bloc", () => {
    const refusal = turnRefusalFrom(problem('https://grrind.app/problems/risala-turn-is-not-open'));
    assert.deepEqual(refusal, { kind: 'turn-gone' });
  });

  it("un tour qui n'est plus le sien recule aussi", () => {
    const refusal = turnRefusalFrom(problem('https://grrind.app/problems/risala-turn-is-not-yours'));
    assert.deepEqual(refusal, { kind: 'turn-gone' });
  });

  it("une guilde disparue est distinguée d'un tour disparu", () => {
    const refusal = turnRefusalFrom(problem('https://grrind.app/problems/guild-not-found'));
    assert.deepEqual(refusal, { kind: 'guild-gone' });
  });

  it("un refus hors du tableau retombe sur 'other' plutôt que de planter", () => {
    const refusal = turnRefusalFrom(problem('https://grrind.app/problems/validation-failed'));
    assert.deepEqual(refusal, { kind: 'other' });
  });

  it("l'absence de réseau retombe aussi sur 'other'", () => {
    assert.deepEqual(turnRefusalFrom(OFFLINE), { kind: 'other' });
  });
});
