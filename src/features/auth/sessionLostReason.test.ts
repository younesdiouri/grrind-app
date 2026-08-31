import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { missingTokenReason, serverRefusalReason, signedOutReason } from './sessionLostReason.ts';

/**
 * Ces tests tournent sous `node --test`, sans Expo, sans disque.
 *
 * C'est le seul endroit où la distinction du `#143` se prouve : sur un appareil, un abandon de
 * session et un premier lancement affichent le même écran de connexion, et rien ne permet de
 * les distinguer après coup.
 */

describe('pourquoi une session a été jetée', () => {
  it("ne trace pas un trousseau vide au premier lancement — il n'y avait rien à perdre", () => {
    assert.equal(missingTokenReason(false), null);
  });

  it('trace un trousseau devenu vide alors qu’une session était en cours', () => {
    assert.deepEqual(missingTokenReason(true), { kind: 'missingToken' });
  });

  it('trace le refus du serveur avec son statut et son type', () => {
    assert.deepEqual(
      serverRefusalReason(401, 'https://grrind.app/problems/invalid-refresh-token'),
      { kind: 'serverRefusal', status: 401, type: 'https://grrind.app/problems/invalid-refresh-token' },
    );
  });

  it('trace un refus sans corps lisible sans inventer de type', () => {
    assert.deepEqual(serverRefusalReason(422, null), { kind: 'serverRefusal', status: 422, type: null });
  });

  it('trace une déconnexion volontaire', () => {
    assert.deepEqual(signedOutReason(), { kind: 'signedOut' });
  });

  it('les trois branches sont distinctes', () => {
    const kinds = new Set(
      [missingTokenReason(true), serverRefusalReason(401, null), signedOutReason()].map(
        (reason) => reason?.kind,
      ),
    );

    assert.equal(kinds.size, 3, 'les trois branches doivent rester discernables');
  });
});
