import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { missingTokenReason, serverRefusalReason, signedOutReason } from './sessionLostReason.ts';

/**
 * Ces tests tournent sous `node --test`, sans Expo, sans disque.
 *
 * C'est le seul endroit où la distinction du `#143` se prouve : sur un appareil, un abandon de
 * session et un premier lancement affichent le même écran de connexion, et rien ne permet de
 * les distinguer après coup. Même chose pour les deux origines de `serverRefusal` : le refus
 * du refresh token et le refus du JWT produisent tous les deux `forget()`, sans rien à l'écran
 * qui les sépare.
 */

describe('pourquoi une session a été jetée', () => {
  it("ne trace pas un trousseau vide au premier lancement — il n'y avait rien à perdre", () => {
    assert.equal(missingTokenReason(false), null);
  });

  it('trace un trousseau devenu vide alors qu’une session était en cours', () => {
    assert.deepEqual(missingTokenReason(true), { kind: 'missingToken' });
  });

  it('trace le refus du refresh token, avec son statut et son type', () => {
    assert.deepEqual(
      serverRefusalReason('refreshEndpoint', 401, 'https://grrind.app/problems/invalid-refresh-token'),
      {
        kind: 'serverRefusal',
        origin: 'refreshEndpoint',
        status: 401,
        type: 'https://grrind.app/problems/invalid-refresh-token',
      },
    );
  });

  it('trace un refus de refresh token sans corps lisible sans inventer de type', () => {
    assert.deepEqual(serverRefusalReason('refreshEndpoint', 422, null), {
      kind: 'serverRefusal',
      origin: 'refreshEndpoint',
      status: 422,
      type: null,
    });
  });

  it('trace le refus du jeton d’accès sur une route authentifiée, distinct du refus du refresh token', () => {
    assert.deepEqual(
      serverRefusalReason('authenticatedRoute', 401, 'https://grrind.app/problems/access-token-invalid'),
      {
        kind: 'serverRefusal',
        origin: 'authenticatedRoute',
        status: 401,
        type: 'https://grrind.app/problems/access-token-invalid',
      },
    );
  });

  it('trace une déconnexion volontaire', () => {
    assert.deepEqual(signedOutReason(), { kind: 'signedOut' });
  });

  it('les quatre traces restent discernables, y compris les deux origines de serverRefusal', () => {
    const signatures = new Set(
      [
        missingTokenReason(true),
        serverRefusalReason('refreshEndpoint', 401, null),
        serverRefusalReason('authenticatedRoute', 401, null),
        signedOutReason(),
      ].map((reason) => JSON.stringify(reason)),
    );

    assert.equal(signatures.size, 4, 'les quatre points qui appellent forget() doivent rester discernables');
  });
});
