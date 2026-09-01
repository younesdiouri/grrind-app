import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createRefreshCoordinator } from './refreshCoordinator.ts';
import {
  expiryFrom,
  isUsable,
  parseStoredSession,
  type StoredSession,
} from './storedSession.ts';

/**
 * Le `#146`, prouvé sur le comportement : **deux démarrages rapprochés ne font tourner le
 * refresh token qu'une fois.**
 *
 * C'est la vérification que le ticket demande, et elle ne se fait pas en important
 * `session.ts` : ce module charge `expo-secure-store` (natif) en tête de fichier, et ça échoue
 * déjà au chargement sous `node --test`. Même idiome que `keychainFailure.test.ts` (voisin,
 * `#142`) : on reconstruit ici la **forme exacte** de `restore()` et d'`adopt()` — l'ordre des
 * branches, ce qui est dans le `try`, ce qui rend `false` — autour d'un trousseau de mensonge.
 * La décision elle-même n'est pas reconstruite : `isUsable`, `expiryFrom` et
 * `parseStoredSession` sont les vraies, importées.
 *
 * Si la forme diverge un jour de `session.ts`, c'est ce fichier qu'il faut corriger avec
 * l'autre. Le signal, ici, c'est qu'elle reste relisible ligne à ligne contre l'original.
 */

/** Le trousseau, en mémoire : deux items indépendants, comme dans `tokenStore.ts`. */
function makeKeychain(options: { throwsOnSessionRead?: boolean } = {}) {
  // Un appareil déjà connecté : le refresh token est là, le second item ne l'est pas encore —
  // c'est l'état exact d'une installation qui vient de passer à cette version.
  const items = new Map<string, string>([['refreshToken', 'refresh-0']]);

  return {
    items,
    readRefreshToken: (): Promise<string | null> =>
      Promise.resolve(items.get('refreshToken') ?? null),
    writeRefreshToken: (token: string): Promise<void> => {
      items.set('refreshToken', token);
      return Promise.resolve();
    },
    readStoredSession: (): Promise<StoredSession | null> => {
      if (options.throwsOnSessionRead === true) {
        return Promise.reject(new Error('errSecInteractionNotAllowed'));
      }
      return Promise.resolve(parseStoredSession(items.get('session') ?? null));
    },
    writeStoredSession: (session: StoredSession): Promise<void> => {
      items.set('session', JSON.stringify(session));
      return Promise.resolve();
    },
  };
}

/**
 * Un serveur qui rotationne comme le vrai : le jeton présenté est consommé, un successeur est
 * émis, et un jeton déjà consommé **révoque la famille** — ce que le back fait vraiment, et ce
 * que ce ticket existe pour ne plus déclencher pour rien.
 */
function makeServer() {
  let issued = 0;
  const live = new Set<string>();
  live.add('refresh-0');

  return {
    rotations: 0,
    familyRevoked: false,
    live,
    rotate(presented: string) {
      this.rotations += 1;

      if (!live.has(presented)) {
        this.familyRevoked = true;
        live.clear();
        return null;
      }

      live.delete(presented);
      issued += 1;
      const pair = {
        accessToken: `jwt-${issued}`,
        refreshToken: `refresh-${issued}`,
        // Le contrat : quinze minutes.
        expiresIn: 900,
        user: { id: 'd3f6…' } as StoredSession['user'],
      };
      live.add(pair.refreshToken);
      return pair;
    },
  };
}

/**
 * Un process, de sa naissance à son état d'auth. Reconstruit `restore()` (`session.ts`) :
 * `resumeStoredSession()` d'abord, la rotation ensuite et seulement sinon.
 */
async function bootProcess(
  keychain: ReturnType<typeof makeKeychain>,
  server: ReturnType<typeof makeServer>,
  now: Date,
): Promise<{ status: 'signedIn' | 'signedOut'; rotated: boolean; forgotten: boolean }> {
  let accessToken: string | null = null;
  let forgotten = false;
  let rotated = false;

  // `adopt()` : le refresh token d'abord — il est déjà consommé côté serveur — puis la session
  // reprenable, puis la mémoire.
  async function adopt(pair: NonNullable<ReturnType<typeof server.rotate>>): Promise<void> {
    await keychain.writeRefreshToken(pair.refreshToken);
    await keychain.writeStoredSession({
      accessToken: pair.accessToken,
      expiresAt: expiryFrom(pair.expiresIn, now),
      user: pair.user,
    });
    accessToken = pair.accessToken;
  }

  // `performRefresh()` : c'est lui, et lui seul, qui parle au serveur.
  async function performRefresh(): Promise<string | null> {
    rotated = true;

    const presented = await keychain.readRefreshToken();
    if (presented === null) {
      forgotten = true;
      return null;
    }

    const pair = server.rotate(presented);
    if (pair === null) {
      forgotten = true;
      return null;
    }

    await adopt(pair);
    return pair.accessToken;
  }

  const coordinator = createRefreshCoordinator({
    currentAccessToken: () => accessToken,
    performRefresh,
  });

  // `resumeStoredSession()` : la lecture est dans le `try`, un rejet rend `false` — donc la
  // rotation — et jamais une déconnexion (#142).
  let stored: StoredSession | null;
  try {
    stored = await keychain.readStoredSession();
  } catch {
    stored = null;
  }

  if (isUsable(stored, now)) {
    accessToken = stored.accessToken;
    return { status: 'signedIn', rotated, forgotten };
  }

  await coordinator.refresh(null);

  return {
    status: accessToken === null ? 'signedOut' : 'signedIn',
    rotated,
    forgotten,
  };
}

const SEVEN_TWENTY_ONE = new Date('2026-09-01T07:21:00.000Z');
const minutesLater = (from: Date, minutes: number) =>
  new Date(from.getTime() + minutes * 60_000);

describe('restore() et la rotation qu’il ne fait plus (#146)', () => {
  it('ne fait tourner le refresh token qu’une fois sur deux démarrages rapprochés', async () => {
    const keychain = makeKeychain();
    const server = makeServer();

    // Le premier démarrage n'a que le refresh token sous la main — un appareil qui vient de
    // passer à cette version, ou qui n'a pas encore adopté depuis. Il rotationne.
    const first = await bootProcess(keychain, server, SEVEN_TWENTY_ONE);
    assert.equal(first.status, 'signedIn');
    assert.equal(first.rotated, true);

    // Douze minutes plus tard, un réveil en arrière-plan : le JWT court jusqu'à 07:36.
    const second = await bootProcess(keychain, server, minutesLater(SEVEN_TWENTY_ONE, 12));

    assert.equal(second.status, 'signedIn', 'la session doit être reprise, pas redemandée');
    assert.equal(second.rotated, false, 'ce démarrage n’avait rien à faire tourner');
    assert.equal(server.rotations, 1, 'deux démarrages, une seule rotation côté serveur');
  });

  it('fait tourner quand le jeton d’accès est expiré — le filet n’a pas bougé', async () => {
    const keychain = makeKeychain();
    const server = makeServer();

    await bootProcess(keychain, server, SEVEN_TWENTY_ONE);
    // Vingt minutes : le JWT de quinze minutes est mort depuis cinq.
    const later = await bootProcess(keychain, server, minutesLater(SEVEN_TWENTY_ONE, 20));

    assert.equal(later.status, 'signedIn');
    assert.equal(later.rotated, true, 'un jeton expiré doit toujours produire une rotation');
    assert.equal(server.rotations, 2);
  });

  it('retombe sur la rotation quand le trousseau refuse de rendre le jeton d’accès, jamais sur une déconnexion', async () => {
    const muet = makeKeychain({ throwsOnSessionRead: true });
    const server = makeServer();

    const boot = await bootProcess(muet, server, SEVEN_TWENTY_ONE);

    assert.equal(boot.status, 'signedIn', 'un magasin illisible n’est pas un magasin vide (#142)');
    assert.equal(boot.rotated, true);
    assert.equal(boot.forgotten, false, 'personne n’a tranché : rien ne doit être effacé');
  });

  it('ne rejoue jamais un jeton déjà consommé : c’est la révocation de famille qu’on évite', async () => {
    const keychain = makeKeychain();
    const server = makeServer();

    // Cinq démarrages en une demi-heure, comme un appareil qu'iOS réveille et tue en boucle.
    for (let i = 0; i < 5; i += 1) {
      await bootProcess(keychain, server, minutesLater(SEVEN_TWENTY_ONE, i * 5));
    }

    assert.equal(server.familyRevoked, false);
    assert.equal(
      server.rotations,
      2,
      'trente minutes couvrent deux durées de vie de JWT, donc deux rotations — pas cinq',
    );
  });
});
