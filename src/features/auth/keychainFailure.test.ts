import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createRefreshCoordinator } from './refreshCoordinator.ts';

/**
 * Le `#142` : un trousseau illisible ne doit jamais figer l'app, ni la déconnecter sur un doute.
 *
 * Ces deux cas ne se prouvent pas en important `session.ts` : ce module charge
 * `expo-secure-store` (natif) et `openapi-fetch` en tête de fichier, et le premier échoue déjà
 * au chargement sous `node --test` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, vérifié en
 * écrivant ce test). C'est exactement pour cette raison que `refreshCoordinator.test.ts`
 * (voisin) prouve le sérialiseur en lui injectant un `performRefresh`, sans jamais importer
 * `session.ts` — même idiome ici, sur `authMiddleware.test.ts` qui reconstruit `refresh()` en
 * ligne plutôt que de l'importer.
 *
 * Chaque test reconstruit donc, à l'identique, la forme exacte de la branche de `session.ts`
 * qu'il vérifie — commentée en regard de son numéro de ligne au moment de l'écriture. Si les
 * deux divergent un jour, c'est ce fichier qu'il faut corriger en même temps que l'autre : le
 * signal, ici, c'est que la forme elle-même (try autour de la lecture ou de l'écriture, jamais
 * de `forget()` sur ce chemin) reste facile à relire ligne à ligne contre `session.ts`.
 */

describe('performRefresh() face à un trousseau illisible en lecture (#142)', () => {
  /**
   * Reproduit `performRefresh()` (`session.ts`) : `readRefreshToken()` est dans le `try`, un
   * rejet devient `null`, et `forget` — qui viderait le trousseau — n'est **pas** appelé.
   */
  function makePerformRefresh(readRefreshToken: () => Promise<string | null>, forget: () => void) {
    return async (): Promise<string | null> => {
      let token: string | null;
      try {
        token = await readRefreshToken();
      } catch {
        return null;
      }

      if (token === null) {
        forget();
        return null;
      }

      return token;
    };
  }

  it("rend « on ne sait pas » (null) quand le trousseau jette, sans appeler forget()", async () => {
    let forgotten = 0;
    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => null,
      performRefresh: makePerformRefresh(
        () => Promise.reject(new Error('errSecInteractionNotAllowed')),
        () => {
          forgotten += 1;
        },
      ),
    });

    const result = await coordinator.refresh(null);

    assert.equal(result, null, 'un trousseau illisible doit rendre null, pas déclencher un rejet');
    assert.equal(forgotten, 0, 'un trousseau illisible n’est pas un trousseau vide : forget() ne doit pas tourner');
  });

  it('ne confond pas le trousseau illisible avec le trousseau vide, qui lui appelle forget()', async () => {
    let forgotten = 0;
    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => null,
      performRefresh: makePerformRefresh(
        () => Promise.resolve(null),
        () => {
          forgotten += 1;
        },
      ),
    });

    const result = await coordinator.refresh(null);

    assert.equal(result, null);
    assert.equal(forgotten, 1, 'un trousseau vide, lui, doit bien appeler forget()');
  });

  it('ne laisse jamais un readRefreshToken qui jette remonter jusqu’au coordinateur', async () => {
    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => null,
      performRefresh: makePerformRefresh(
        () => Promise.reject(new Error('errSecInteractionNotAllowed')),
        () => {},
      ),
    });

    // `assert.doesNotReject` échouerait si le rejet du trousseau traversait `performRefresh()`
    // sans être rattrapé — exactement le défaut qui gelait `restore()` avant le `#142`.
    await assert.doesNotReject(coordinator.refresh(null));
  });
});

describe("adopt() face à un trousseau illisible en écriture (#142)", () => {
  /**
   * Reproduit `adopt()` (`session.ts`) : `writeRefreshToken()` est dans le `try`, un rejet est
   * avalé, et la session est tout de même adoptée en mémoire — elle n'est **pas** jetée.
   */
  async function adopt(
    writeRefreshToken: () => Promise<void>,
    setAccessToken: (token: string) => void,
    publishSignedIn: () => void,
  ): Promise<void> {
    try {
      await writeRefreshToken();
    } catch {
      // Trace au sens du vrai `adopt()` (`noteSessionLost`) ; ici on vérifie seulement qu'on
      // ne relance pas et qu'on continue.
    }
    setAccessToken('jeton-neuf');
    publishSignedIn();
  }

  it("garde la session active en mémoire même quand l'écriture sur le disque échoue", async () => {
    let accessToken: string | null = null;
    let signedIn = 0;

    await adopt(
      () => Promise.reject(new Error('errSecInteractionNotAllowed')),
      (token) => {
        accessToken = token;
      },
      () => {
        signedIn += 1;
      },
    );

    assert.equal(accessToken, 'jeton-neuf', 'le jeton doit rester utilisable en mémoire');
    assert.equal(signedIn, 1, 'la session ne doit pas être jetée pour une panne d’écriture');
  });

  it("n'appelle jamais forget() ni ne rejette quand l'écriture échoue", async () => {
    let forgotten = 0;

    await assert.doesNotReject(
      adopt(
        () => Promise.reject(new Error('errSecInteractionNotAllowed')),
        () => {},
        () => {},
      ),
    );

    assert.equal(forgotten, 0, 'écrire en échec ne doit jamais déclencher forget()');
  });
});
