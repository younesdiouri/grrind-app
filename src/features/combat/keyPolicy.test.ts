import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createBatchKeys, type KeyRecord } from '@/features/health/batchKey';
import type { Failure, ProblemDetails } from '@/features/auth/problems';

import { forgetsKeyAfter, intentionOf } from './keyPolicy.ts';

/**
 * Un trousseau qui survit à l'app, et une app qui redémarre.
 *
 * `held` est le disque : il persiste d'un `createBatchKeys` à l'autre, exactement comme le
 * magasin sécurisé persiste d'un lancement à l'autre. C'est ce qui permet de rejouer « l'app a
 * été tuée pendant que la requête était en vol » sans monter Expo.
 */
function keychain() {
  let held: KeyRecord | null = null;
  let minted = 0;

  return {
    /** Un lancement de l'app : un trousseau neuf, sur le même disque. */
    boot: () =>
      createBatchKeys({
        read: async () => held,
        write: async (record) => {
          held = record;
        },
        erase: async () => {
          held = null;
        },
        mint: () => {
          minted += 1;
          return `cle-${minted}`;
        },
      }),
    get minted() {
      return minted;
    },
    get held() {
      return held;
    },
  };
}

function problem(type: ProblemDetails['type']): Failure {
  return { kind: 'problem', problem: { type, title: 'x', status: 422, detail: 'x' } };
}

describe('l’intention d’un combat', () => {
  it('distingue deux adversaires', () => {
    assert.notEqual(intentionOf('SAND_JACKAL'), intentionOf('DUNE_SOVEREIGN'));
  });

  it('nomme l’absence de choix plutôt que de la laisser vide', () => {
    // Une empreinte vide se confondrait avec un enregistrement tronqué, et les deux ne veulent
    // pas dire la même chose.
    assert.equal(intentionOf(null), 'auto');
    assert.notEqual(intentionOf(null), '');
  });

  it('ne peut pas être imitée par une clé d’adversaire qui s’appellerait « auto »', () => {
    assert.notEqual(intentionOf('auto'), intentionOf(null));
  });
});

describe('la clé d’idempotence d’un combat', () => {
  it('ne change pas entre deux tentatives, même app redémarrée', async () => {
    // **Le test qui justifie le ticket.** Son échec ne se voit pas à l'œil : les deux issues
    // affichent une animation, et la mauvaise ne se manifeste qu'à l'ouverture suivante de
    // l'historique, où deux combats attendent au lieu d'un.
    const disk = keychain();

    const first = await disk.boot().keyFor(intentionOf('SAND_JACKAL'));
    // L'app est tuée ici : la requête était en vol, aucun verdict n'est tombé.
    const second = await disk.boot().keyFor(intentionOf('SAND_JACKAL'));

    assert.equal(second, first);
    assert.equal(disk.minted, 1, 'une seule clé a été frappée pour une seule intention');
  });

  it('en frappe une neuve pour un autre adversaire', async () => {
    const disk = keychain();
    const keys = disk.boot();

    const jackal = await keys.keyFor(intentionOf('SAND_JACKAL'));
    const sovereign = await keys.keyFor(intentionOf('DUNE_SOVEREIGN'));

    assert.notEqual(sovereign, jackal);
  });

  it('en frappe une neuve après un verdict — retaper, c’est un nouveau combat', async () => {
    const disk = keychain();
    const keys = disk.boot();

    const first = await keys.keyFor(intentionOf('SAND_JACKAL'));
    await keys.forget();
    const second = await keys.keyFor(intentionOf('SAND_JACKAL'));

    assert.notEqual(second, first);
    assert.equal(disk.minted, 2);
  });

  it('sérialise deux demandes concurrentes plutôt que d’en frapper deux', async () => {
    const disk = keychain();
    const keys = disk.boot();

    const [a, b] = await Promise.all([
      keys.keyFor(intentionOf('SAND_JACKAL')),
      keys.keyFor(intentionOf('SAND_JACKAL')),
    ]);

    assert.equal(a, b);
    assert.equal(disk.minted, 1);
  });
});

describe('quand la clé s’efface, et quand elle survit', () => {
  it('s’efface sur les deux refus qui prouvent qu’aucun combat n’a été écrit', () => {
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/enemy-key-unknown')), true);
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/enemy-level-too-low')), true);
  });

  it('survit à une panne sans réponse — la fenêtre que tout ceci ferme', () => {
    assert.equal(forgetsKeyAfter({ kind: 'offline' }), false);
  });

  it('survit à un 500, qui ne dit pas si le combat a été écrit', () => {
    // La panne peut être survenue avant comme après l'écriture, et rien dans la réponse ne
    // permet de trancher. Effacer ici ferait repartir le tirage à la tentative suivante.
    assert.equal(forgetsKeyAfter(problem('https://grrind.app/problems/internal-error')), false);
  });

  it('survit à un 409 « déjà en vol », qui dit le contraire d’un verdict', () => {
    assert.equal(
      forgetsKeyAfter(problem('https://grrind.app/problems/idempotency-key-in-flight')),
      false,
    );
  });

  it('survit à une panne que cette version du client ne connaît pas', () => {
    // Un back plus récent que l'app installée. Garder est sans danger — le corps n'a pas
    // changé, donc rejouer la clé est un rejeu légitime.
    assert.equal(
      forgetsKeyAfter({
        kind: 'problem',
        problem: { type: 'https://grrind.app/problems/inconnue', title: 'x', status: 418, detail: 'x' } as unknown as ProblemDetails,
      }),
      false,
    );
  });
});
