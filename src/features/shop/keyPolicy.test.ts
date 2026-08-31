import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Failure, ProblemDetails } from '@/features/auth/problems';

import { chestOpenIntention, forgetsKeyAfter, purchaseIntention } from './keyPolicy.ts';

function problem(type: ProblemDetails['type']): Failure {
  return { kind: 'problem', problem: { type, title: 'x', status: 422, detail: 'x' } };
}

describe('les intentions boutique et coffre', () => {
  it('distingue un achat de l’ouverture du même objet', () => {
    assert.notEqual(purchaseIntention('DUNE_CHEST'), chestOpenIntention('DUNE_CHEST'));
  });

  it('garde la même intention à travers un retry', () => {
    assert.equal(purchaseIntention('WORN_RUNNING_SHOES'), purchaseIntention('WORN_RUNNING_SHOES'));
    assert.equal(chestOpenIntention('DUNE_CHEST'), chestOpenIntention('DUNE_CHEST'));
  });
});

describe('le verdict d’une action boutique', () => {
  it('oublie la clé des refus qui prouvent qu’aucune action n’a été écrite', () => {
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/insufficient-coin-balance')), true);
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/item-not-purchasable')), true);
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/item-already-owned')), true);
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/shop-level-too-low')), true);
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/item-not-owned')), true);
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/item-not-a-chest')), true);
  });

  it('garde la clé tant qu’un résultat écrit reste incertain', () => {
    assert.equal(forgetsKeyAfter({ kind: 'offline' }), false);
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/internal-error')), false);
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/idempotency-key-in-flight')), false);
  });
});
