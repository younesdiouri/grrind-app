import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SyncSummary } from '@/features/reward/timeline';

import { shouldCommitAnchor } from './anchorPolicy.ts';
import type { SyncResult } from './sync.ts';

/**
 * Le banc de la décision « faut-il faire avancer l'ancre HealthKit ».
 *
 * Le cas qui compte vraiment est le second : une séance supprimée dans Santé produit un
 * `nothingToSend` et doit quand même faire avancer l'ancre, sous peine de réveiller l'app à
 * chaque changement, pour toujours, sans qu'aucun réveil ne puisse jamais aboutir.
 */
describe("l'ancre HealthKit après un verdict de synchronisation", () => {
  it('avance sur un import réussi', () => {
    const result: SyncResult = {
      kind: 'summary',
      summary: {} as unknown as SyncSummary,
      replayed: false,
    };
    assert.equal(shouldCommitAnchor(result), true);
  });

  it("avance quand il n'y avait rien à envoyer — le cas d'une suppression", () => {
    assert.equal(shouldCommitAnchor({ kind: 'nothingToSend' }), true);
  });

  it("n'avance pas quand le fournisseur de santé est indisponible", () => {
    assert.equal(shouldCommitAnchor({ kind: 'unavailable' }), false);
  });

  it("n'avance pas quand notre propre budget a coupé la course avant un verdict (#140)", () => {
    assert.equal(shouldCommitAnchor({ kind: 'budgetExceeded' }), false);
  });

  it("n'avance pas sur une issue inconnue : hors ligne", () => {
    assert.equal(
      shouldCommitAnchor({ kind: 'failed', failure: { kind: 'offline' } }),
      false,
    );
  });

  it("n'avance pas sur une panne serveur — on ne sait pas ce qui a été fait", () => {
    assert.equal(
      shouldCommitAnchor({
        kind: 'failed',
        failure: {
          kind: 'problem',
          problem: { type: 'https://grrind.app/problems/internal-error', title: 'x', status: 500, detail: 'x' },
        },
      }),
      false,
    );
  });

  it("n'avance pas quand une tentative précédente est encore en vol", () => {
    assert.equal(
      shouldCommitAnchor({
        kind: 'failed',
        failure: {
          kind: 'problem',
          problem: {
            type: 'https://grrind.app/problems/idempotency-key-in-flight',
            title: 'x',
            status: 409,
            detail: 'x',
          },
        },
      }),
      false,
    );
  });

  it('avance sur un refus définitif — le serveur a tranché, rejouer ne changerait rien', () => {
    assert.equal(
      shouldCommitAnchor({
        kind: 'failed',
        failure: {
          kind: 'problem',
          problem: {
            type: 'https://grrind.app/problems/idempotency-key-reused',
            title: 'x',
            status: 409,
            detail: 'x',
          },
        },
      }),
      true,
    );
  });
});
