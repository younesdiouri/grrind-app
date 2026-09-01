import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EXPIRY_MARGIN_SECONDS,
  expiryFrom,
  isUsable,
  parseStoredSession,
  type StoredSession,
} from './storedSession.ts';

/**
 * Le `#146` : un démarrage ne doit faire tourner le refresh token que s'il n'a rien
 * d'utilisable sous la main.
 *
 * Cette décision se prouve ici et nulle part ailleurs. Sur un appareil, les deux issues —
 * « j'ai repris » et « j'ai renouvelé » — affichent exactement le même écran ; la mauvaise ne
 * se manifeste qu'une heure plus tard, par une déconnexion, et seulement si le process meurt
 * pendant la milliseconde qu'il fallait. Même raison que `refreshCoordinator.test.ts` et
 * `sessionLostReason.test.ts` : le module n'a aucune dépendance d'exécution, précisément pour
 * pouvoir être interrogé ligne à ligne.
 */

const NOW = new Date('2026-09-01T07:43:00.000Z');

function session(over: Partial<StoredSession> = {}): StoredSession {
  return {
    accessToken: 'jwt',
    expiresAt: '2026-09-01T07:48:00.000Z',
    user: { id: 'd3f6…' } as StoredSession['user'],
    ...over,
  };
}

describe('expiryFrom', () => {
  it('dérive l’instant d’expiration de la durée de vie rendue par le contrat', () => {
    // `TokenPair.expiresIn` : des secondes, `900` dans l'exemple du contrat.
    assert.equal(expiryFrom(900, NOW), '2026-09-01T07:58:00.000Z');
  });
});

describe('isUsable', () => {
  it('reprend un jeton d’accès encore valide — c’est la rotation que le #146 supprime', () => {
    // Le réveil de 07:43 du ticket : le JWT émis à 07:33 courait jusqu'à 07:48. Il n'avait
    // aucune raison de faire tourner quoi que ce soit.
    assert.equal(isUsable(session(), NOW), true);
  });

  it('renouvelle quand le jeton est expiré', () => {
    assert.equal(isUsable(session({ expiresAt: '2026-09-01T07:42:59.000Z' }), NOW), false);
  });

  it('renouvelle dans la marge, plutôt que de risquer un 401 au premier appel', () => {
    const dansLaMarge = new Date(NOW.getTime() + (EXPIRY_MARGIN_SECONDS - 1) * 1000);
    assert.equal(
      isUsable(session({ expiresAt: dansLaMarge.toISOString() }), NOW),
      false,
      'un jeton qui expire dans moins d’une minute ne survivrait pas à la synchro de lancement',
    );
  });

  it('renouvelle quand il n’y a rien de stocké — premier lancement, ou version d’avant le #146', () => {
    assert.equal(isUsable(null, NOW), false);
  });

  it('renouvelle sur une date illisible plutôt que de la lire comme une éternité', () => {
    // `Date.parse` rend `NaN`, et toute comparaison avec `NaN` est fausse : sans le test
    // explicite, `NaN > x` rendrait déjà `false` — mais par accident, et un jour où la
    // comparaison changerait de sens ce serait une session reprise pour toujours.
    assert.equal(isUsable(session({ expiresAt: 'hier' }), NOW), false);
  });
});

describe('parseStoredSession', () => {
  it('relit ce qu’un adopt() a écrit', () => {
    const written = session();
    assert.deepEqual(parseStoredSession(JSON.stringify(written)), written);
  });

  it('rend null sur un item absent', () => {
    assert.equal(parseStoredSession(null), null);
  });

  it('rend null sur un contenu qui n’est pas du JSON', () => {
    assert.equal(parseStoredSession('{'), null);
  });

  it('rend null sur une forme incomplète, plutôt qu’un signedIn au profil troué', () => {
    // Le disque a été écrit par une version de l'app qui n'est pas forcément celle qui le
    // relit. Une rotation est toujours récupérable ; un `{ status: 'signedIn' }` portant un
    // profil sans `id` casse au premier écran qui le lit.
    assert.equal(parseStoredSession(JSON.stringify({ accessToken: 'jwt' })), null);
    assert.equal(
      parseStoredSession(JSON.stringify({ ...session(), user: { displayName: 'Younes' } })),
      null,
    );
    assert.equal(parseStoredSession(JSON.stringify({ ...session(), accessToken: '' })), null);
  });
});
