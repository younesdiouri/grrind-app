import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLaunchGate, type LaunchGateDeps } from './launchGate.ts';

/**
 * Le banc du portillon de lancement.
 *
 * Il prouve le chemin d'ouverture de l'app **sans monter l'app** : ni disque, ni réseau, ni
 * horloge réelle. C'est ce qui permet de vérifier une borne d'une seconde et demie en une
 * milliseconde, et surtout de prouver le cas qui compte — l'app qui s'ouvre alors que le
 * réseau ne répondra jamais.
 */

type Harness = {
  deps: LaunchGateDeps;
  /** Fait tomber un verdict de synchronisation. */
  settleSync: () => void;
  /** Notifie le magasin **sans** faire tomber de verdict — le passage `idle → syncing`. */
  notifyWithoutVerdict: () => void;
  /** Fait expirer la borne. */
  fireTimer: () => void;
  timersArmed: () => number;
  timersCleared: () => number;
  listeners: () => number;
};

function harness(options: { pending?: boolean } = {}): Harness {
  let revision = 0;
  const syncListeners = new Set<() => void>();
  let armed = 0;
  let cleared = 0;
  let pendingTimer: (() => void) | null = null;

  return {
    deps: {
      hasPending: () => options.pending === true,
      settledRevision: () => revision,
      subscribeToSync: (listener) => {
        syncListeners.add(listener);
        return () => syncListeners.delete(listener);
      },
      timeoutMs: 1_500,
      setTimer: (run) => {
        armed += 1;
        pendingTimer = run;
        return armed;
      },
      clearTimer: () => {
        cleared += 1;
      },
    },
    settleSync: () => {
      revision += 1;
      for (const listener of [...syncListeners]) {
        listener();
      }
    },
    notifyWithoutVerdict: () => {
      for (const listener of [...syncListeners]) {
        listener();
      }
    },
    fireTimer: () => pendingTimer?.(),
    timersArmed: () => armed,
    timersCleared: () => cleared,
    listeners: () => syncListeners.size,
  };
}

describe('le portillon de lancement', () => {
  it("n'attend rien quand personne n'est connecté", () => {
    const bench = harness();
    const gate = createLaunchGate(bench.deps);

    gate.begin(false);

    assert.equal(gate.isSettled(), true);
    // Aucune minuterie : il n'y a pas de synchronisation à attendre.
    assert.equal(bench.timersArmed(), 0);
  });

  it("n'attend rien quand une progression attend déjà — c'est le cas hors ligne", () => {
    const bench = harness({ pending: true });
    const gate = createLaunchGate(bench.deps);

    gate.begin(true);

    // Le point de tout le mécanisme : une progression non jouée est sur le disque, donc
    // connue sans le moindre aller-retour. L'animation est le premier écran, même en avion.
    assert.equal(gate.isSettled(), true);
    assert.equal(bench.timersArmed(), 0);
  });

  it('attend le verdict de la synchronisation quand rien n’attend', () => {
    const bench = harness();
    const gate = createLaunchGate(bench.deps);

    gate.begin(true);
    assert.equal(gate.isSettled(), false);
    assert.equal(bench.timersArmed(), 1);

    bench.settleSync();
    assert.equal(gate.isSettled(), true);
    // La minuterie est désarmée, sinon elle se rappellerait dans le vide une seconde plus tard.
    assert.equal(bench.timersCleared(), 1);
  });

  it("ouvre l'app quand le réseau ne répond jamais", () => {
    const bench = harness();
    const gate = createLaunchGate(bench.deps);

    gate.begin(true);
    assert.equal(gate.isSettled(), false);

    // Le métro, l'avion, une barre de réseau. Aucun verdict ne tombera.
    bench.fireTimer();

    assert.equal(gate.isSettled(), true);
  });

  it('se détache de la synchronisation une fois posé', () => {
    const bench = harness();
    const gate = createLaunchGate(bench.deps);

    gate.begin(true);
    assert.equal(bench.listeners(), 1);

    bench.settleSync();
    assert.equal(bench.listeners(), 0);
  });

  it('ne revient jamais en arrière et ne prévient qu’une fois', () => {
    const bench = harness();
    const gate = createLaunchGate(bench.deps);

    let notified = 0;
    gate.subscribe(() => {
      notified += 1;
    });

    gate.begin(true);
    bench.settleSync();
    // Une synchronisation de retour au premier plan, plus tard : l'écran de démarrage est
    // parti depuis longtemps, rien ne doit bouger.
    bench.settleSync();
    bench.fireTimer();

    assert.equal(notified, 1);
    assert.equal(gate.isSettled(), true);
  });

  it("n'attend pas un verdict déjà tombé", () => {
    const bench = harness();
    const gate = createLaunchGate(bench.deps);

    // Les effets de React remontent des enfants vers les parents : la synchronisation de
    // lancement part avant que ce portillon s'arme, et rien ne garantit qu'elle n'ait pas
    // déjà répondu. Attendre le verdict *suivant* coûterait la borne entière.
    bench.settleSync();

    gate.begin(true);

    assert.equal(gate.isSettled(), true);
    assert.equal(bench.timersArmed(), 0);
  });

  it('est idempotent : deux montages ne lancent pas deux attentes', () => {
    const bench = harness();
    const gate = createLaunchGate(bench.deps);

    // React monte deux fois en développement.
    gate.begin(true);
    gate.begin(true);

    assert.equal(bench.timersArmed(), 1);
    assert.equal(bench.listeners(), 1);
  });

  it('ignore le passage `idle → syncing`, qui ne change aucun chiffre', () => {
    const bench = harness();
    const gate = createLaunchGate(bench.deps);

    gate.begin(true);

    // Le magasin notifie au départ de la synchronisation, mais le compteur de verdicts n'a
    // pas bougé : retirer l'écran de démarrage ici afficherait l'accueil avant de savoir
    // s'il y a une animation à jouer.
    bench.notifyWithoutVerdict();

    assert.equal(gate.isSettled(), false);
    assert.equal(bench.timersCleared(), 0);

    // Et le verdict, lui, le pose bien.
    bench.settleSync();
    assert.equal(gate.isSettled(), true);
  });
});
