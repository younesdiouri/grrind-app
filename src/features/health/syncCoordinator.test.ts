import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSyncCoordinator } from './syncCoordinator.ts';

/**
 * Le banc du sérialiseur de synchronisation.
 *
 * Il prouve l'invariant qui coûte une **animation** : deux synchronisations concurrentes
 * enverraient les mêmes workouts deux fois, le serveur dédoublonnerait, et le second appel
 * rendrait un `SyncSummary` vide. L'XP serait juste, le produit serait cassé — et rien dans
 * les journaux ne le dirait.
 *
 * Aucune horloge réelle, aucun réseau : c'est ce qui permet de prouver un seuil de trente
 * secondes en une milliseconde.
 */

/** Une synchronisation qu'on résout à la main, pour tenir la fenêtre ouverte. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (e: unknown) => void } {
  let resolve!: (value: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('le sérialiseur de synchronisation', () => {
  it("ne lance qu'une synchronisation pour deux déclencheurs concurrents", async () => {
    const gate = deferred<string>();
    let started = 0;

    const coordinator = createSyncCoordinator<string>({
      perform: () => {
        started += 1;
        return gate.promise;
      },
      now: () => 0,
      minimumIntervalMs: 30_000,
    });

    // L'ouverture de l'app, puis le geste de l'utilisateur avant que la première revienne.
    const first = coordinator.sync('launch');
    const second = coordinator.sync('manual');

    gate.resolve('un seul lot');

    assert.deepEqual(await first, { status: 'done', result: 'un seul lot' });
    // Le retardataire reçoit **le même résultat**, pas une synchronisation vide.
    assert.deepEqual(await second, { status: 'joined', result: 'un seul lot' });
    assert.equal(started, 1, 'un seul envoi est parti');
  });

  it('rejoint même sous le seuil : le résultat existe déjà, il suffit de l\'attendre', async () => {
    const gate = deferred<string>();
    const coordinator = createSyncCoordinator<string>({
      perform: () => gate.promise,
      now: () => 0,
      minimumIntervalMs: 30_000,
    });

    const first = coordinator.sync('launch');
    const joined = coordinator.sync('foreground');

    gate.resolve('résumé');

    await first;
    assert.deepEqual(await joined, { status: 'joined', result: 'résumé' });
  });

  it('refuse deux synchronisations rapprochées, sans que ce soit une erreur', async () => {
    let clock = 0;
    let started = 0;

    const coordinator = createSyncCoordinator<string>({
      perform: async () => {
        started += 1;
        return 'résumé';
      },
      now: () => clock,
      minimumIntervalMs: 30_000,
    });

    await coordinator.sync('launch');

    // L'utilisateur bascule vers ses messages et revient dix secondes plus tard.
    clock = 10_000;
    assert.deepEqual(await coordinator.sync('foreground'), { status: 'throttled' });
    assert.equal(started, 1);

    // Passé le seuil, elle repart.
    clock = 31_000;
    assert.deepEqual(await coordinator.sync('foreground'), { status: 'done', result: 'résumé' });
    assert.equal(started, 2);
  });

  it('laisse toujours passer le geste de rafraîchissement', async () => {
    let clock = 0;
    let started = 0;

    const coordinator = createSyncCoordinator<string>({
      perform: async () => {
        started += 1;
        return 'résumé';
      },
      now: () => clock,
      minimumIntervalMs: 30_000,
    });

    await coordinator.sync('launch');

    // Le filet quand tout le reste a raté : lui opposer un seuil serait exactement le moment
    // où l'app a l'air cassée.
    clock = 1_000;
    assert.deepEqual(await coordinator.sync('manual'), { status: 'done', result: 'résumé' });
    assert.equal(started, 2);
  });

  it('libère la promesse partagée même quand la synchronisation échoue', async () => {
    let attempt = 0;

    const coordinator = createSyncCoordinator<string>({
      perform: async () => {
        attempt += 1;
        if (attempt === 1) {
          throw new Error('réseau coupé');
        }
        return 'enfin';
      },
      now: () => attempt * 60_000,
      minimumIntervalMs: 30_000,
    });

    await assert.rejects(() => coordinator.sync('launch'));

    // Sans la libération, l'app resterait accrochée à une promesse rejetée pour toujours.
    assert.deepEqual(await coordinator.sync('launch'), { status: 'done', result: 'enfin' });
  });
});
