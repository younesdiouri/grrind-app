import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createRefreshCoordinator } from './refreshCoordinator.ts';

/**
 * Ces tests tournent sous `node --test`, sans Expo, sans React, sans appareil.
 *
 * C'est le seul endroit où la règle se prouve. Sur un téléphone, un rafraîchissement et deux
 * affichent exactement le même écran : la différence ne se manifeste qu'à l'ouverture
 * suivante, par une déconnexion que personne ne saura relier à ce moment-là.
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('le coordinateur de rafraîchissement', () => {
  it("ne lance qu'un seul rafraîchissement pour deux appels concurrents", async () => {
    let performed = 0;
    let token = 'stale';

    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => token,
      performRefresh: async () => {
        performed += 1;
        await delay(10);
        token = 'fresh';
        return token;
      },
    });

    const [first, second] = await Promise.all([
      coordinator.refresh('stale'),
      coordinator.refresh('stale'),
    ]);

    assert.equal(performed, 1, 'deux rafraîchissements révoqueraient la famille');
    assert.equal(first, 'fresh');
    assert.equal(second, 'fresh');
  });

  it('rend le jeton courant à qui présente un jeton déjà remplacé, sans en brûler un autre', async () => {
    let performed = 0;
    let token = 'stale';

    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => token,
      performRefresh: async () => {
        performed += 1;
        token = 'fresh';
        return token;
      },
    });

    // Une première requête découvre l'expiration et renouvelle.
    assert.equal(await coordinator.refresh('stale'), 'fresh');

    // Une seconde était partie avant, avec l'ancien jeton, et revient en 401 maintenant. Son
    // refus ne prouve rien sur la session : il faut la rejouer, pas renouveler.
    assert.equal(await coordinator.refresh('stale'), 'fresh');

    assert.equal(performed, 1);
  });

  it('laisse repartir un rafraîchissement une fois le précédent terminé', async () => {
    let performed = 0;
    let token = 'a';

    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => token,
      performRefresh: async () => {
        performed += 1;
        token = `token-${performed}`;
        return token;
      },
    });

    await coordinator.refresh('a');
    // Le jeton présenté est bien le courant : c'est une vraie expiration, pas un retardataire.
    await coordinator.refresh(token);

    assert.equal(performed, 2, 'la promesse partagée doit se libérer, pas rester collée');
  });

  it('libère la promesse partagée même quand le rafraîchissement échoue', async () => {
    let performed = 0;

    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => null,
      performRefresh: async () => {
        performed += 1;
        throw new Error('réseau coupé');
      },
    });

    await assert.rejects(coordinator.refresh(null));
    await assert.rejects(coordinator.refresh(null));

    assert.equal(performed, 2, 'un échec ne doit pas condamner la session à ne plus renouveler');
  });

  it('propage la mort de la session sans la confondre avec un retardataire', async () => {
    const coordinator = createRefreshCoordinator({
      currentAccessToken: () => null,
      performRefresh: async () => null,
    });

    assert.equal(await coordinator.refresh('stale'), null);
  });
});
