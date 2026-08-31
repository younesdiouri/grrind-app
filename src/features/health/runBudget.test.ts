import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BudgetExceeded, withinBudget } from './runBudget.ts';

/**
 * Le banc de `withinBudget` (revue de la #141, #140).
 *
 * Ce que ça prouve, très précisément : un appel dont le budget expire **pendant** l'attente —
 * le cas le plus fréquent en pratique, pas le point de contrôle posé après un `await` qui ne
 * revient jamais à temps — se classe bien `BudgetExceeded`, et une vraie panne ne se fait pas
 * passer pour un abandon.
 */

/** Une promesse contrôlée depuis le test, sans jamais dépendre d'un vrai délai. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('sans budget', () => {
  it('rend la valeur telle quelle — pas de couperet en avant-plan', async () => {
    const value = await withinBudget(Promise.resolve('valeur'), undefined);
    assert.equal(value, 'valeur');
  });

  it('laisse passer un vrai refus tel quel', async () => {
    await assert.rejects(withinBudget(Promise.reject(new Error('panne')), undefined), /panne/);
  });
});

describe('avec un budget déjà expiré', () => {
  it("jette BudgetExceeded sans attendre l'appel, même s'il finirait par répondre", async () => {
    const controller = new AbortController();
    controller.abort();
    const { promise } = deferred<string>();

    await assert.rejects(withinBudget(promise, controller.signal), BudgetExceeded);
  });
});

describe('avec un budget qui expire pendant l’attente', () => {
  it("classe l'abandon en BudgetExceeded — c'est le chemin qui manquait avant la #141", async () => {
    const controller = new AbortController();
    const { promise } = deferred<string>();

    const race = withinBudget(promise, controller.signal);
    controller.abort();

    await assert.rejects(race, BudgetExceeded);
  });

  it("classe l'abandon en BudgetExceeded même quand l'appel sous-jacent rejette ensuite sur un AbortError, sans le laisser passer pour une panne réseau", async () => {
    const controller = new AbortController();
    const { promise, reject } = deferred<string>();

    const race = withinBudget(promise, controller.signal);
    controller.abort();
    // Le rejet « réel » arrive après coup, comme un `fetch` qui a fini par honorer le signal
    // une fois le budget déjà tranché : `withinBudget` a déjà rendu la main sur son propre
    // verdict, et ne doit pas le changer sous lui.
    reject(new Error('AbortError'));

    await assert.rejects(race, BudgetExceeded);
  });

  it("classe l'abandon en BudgetExceeded même quand l'appel sous-jacent ne revient jamais — le rejeu post-refresh dont le signal ne s'est pas propagé", async () => {
    const controller = new AbortController();
    const { promise } = deferred<string>();

    const race = withinBudget(promise, controller.signal);
    controller.abort();

    await assert.rejects(race, BudgetExceeded);
    // `promise` n'est jamais réglée : la course sous-jacente continue dans le vide, sans
    // conséquence — c'est exactement le point.
  });
});

describe('quand l’appel répond avant que le budget ne tranche', () => {
  it('rend la valeur, et un abandon plus tardif du même signal ne la reprend pas', async () => {
    const controller = new AbortController();
    const { promise, resolve } = deferred<string>();

    const race = withinBudget(promise, controller.signal);
    resolve('valeur');
    const value = await race;
    controller.abort();

    assert.equal(value, 'valeur');
  });

  it('laisse passer un vrai refus tel quel plutôt que de le classer BudgetExceeded', async () => {
    const controller = new AbortController();
    const { promise, reject } = deferred<string>();

    const race = withinBudget(promise, controller.signal);
    reject(new Error('panne réseau'));

    await assert.rejects(race, /panne réseau/);
  });
});
