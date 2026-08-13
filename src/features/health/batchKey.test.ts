import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createBatchKeys, fingerprintOf, type KeyRecord } from './batchKey.ts';
import { windowStart } from './syncState.ts';

/**
 * Le banc de la clé d'idempotence du lot.
 *
 * Ce qu'il prouve n'est **pas** que l'XP ne double pas — l'unicité `(source, externalId)` côté
 * serveur s'en charge, et elle tient sans nous. Ce qu'il prouve, c'est qu'un rejeu récupère la
 * **réponse d'origine** au lieu d'une synchronisation vide : sans ça, un client qui rejoue voit
 * son animation disparaître alors que son XP est bien créditée. C'est la panne qu'un journal ne
 * montre pas et qu'un utilisateur ne sait pas décrire.
 */

function store(initial: KeyRecord | null = null) {
  let held = initial;
  let minted = 0;

  return {
    keys: createBatchKeys({
      read: async () => held,
      write: async (record) => {
        held = record;
      },
      erase: async () => {
        held = null;
      },
      mint: () => {
        minted += 1;
        return `clé-${minted}`;
      },
    }),
    held: () => held,
    minted: () => minted,
  };
}

describe("la clé d'idempotence du lot", () => {
  it('renvoie la même clé tant que le lot ne change pas', async () => {
    const { keys, minted } = store();
    const lot = fingerprintOf(['a', 'b', 'c']);

    const first = await keys.keyFor(lot);
    const retry = await keys.keyFor(lot);

    assert.equal(retry, first, 'un rejeu doit présenter la même clé');
    assert.equal(minted(), 1);
  });

  it('en frappe une neuve quand le lot a changé', async () => {
    // Le serveur empreinte le corps : rejouer la même clé sur un lot différent n'est pas un
    // rejeu mais un abus, et vaut un 409 `idempotency-key-reused`.
    const { keys, minted } = store();

    const before = await keys.keyFor(fingerprintOf(['a', 'b']));
    const after = await keys.keyFor(fingerprintOf(['a', 'b', 'c']));

    assert.notEqual(after, before);
    assert.equal(minted(), 2);
  });

  it("survit à la mort de l'app : la clé persistée est celle qui repart", async () => {
    // C'est le cas que le mécanisme existe pour couvrir. L'app est tuée pendant que l'import
    // est en vol ; au redémarrage le curseur serveur n'a pas bougé, donc le fournisseur rend
    // les mêmes workouts, donc l'empreinte est la même — et la clé doit l'être aussi.
    const lot = fingerprintOf(['a', 'b']);
    const survivor: KeyRecord = { key: 'clé-du-vol-précédent', fingerprint: lot };

    const { keys, minted } = store(survivor);

    assert.equal(await keys.keyFor(lot), 'clé-du-vol-précédent');
    assert.equal(minted(), 0, 'aucune clé neuve : ce serait perdre la réponse d\'origine');
  });

  it('oublie la clé quand le lot a obtenu son verdict', async () => {
    const { keys, held } = store();

    await keys.keyFor(fingerprintOf(['a']));
    await keys.forget();

    assert.equal(held(), null);
  });

  it('sérialise les accès : deux demandes simultanées ne frappent pas deux clés', async () => {
    // Le stockage est asynchrone, donc la fenêtre est réelle : deux lectures concurrentes du
    // trousseau vide se croiseraient sans la file d'attente.
    const { keys, minted } = store();
    const lot = fingerprintOf(['a']);

    const [first, second] = await Promise.all([keys.keyFor(lot), keys.keyFor(lot)]);

    assert.equal(first, second);
    assert.equal(minted(), 1);
  });

  it("distingue deux lots des mêmes séances rangées autrement", () => {
    // L'ordre est dans le corps, donc dans l'empreinte du serveur.
    assert.notEqual(fingerprintOf(['a', 'b']), fingerprintOf(['b', 'a']));
    assert.equal(fingerprintOf(['a', 'b']), fingerprintOf(['a', 'b']));
    assert.notEqual(fingerprintOf(['a']), fingerprintOf([]));
  });
});

describe('la fenêtre à demander au fournisseur', () => {
  const now = new Date('2026-08-13T12:00:00Z');

  it('demande la fenêtre servie par le serveur au tout premier lancement', () => {
    // Et surtout pas « tout HealthKit » : un téléphone contient parfois trois ans d'Apple
    // Santé, et le contrat borne un lot à 200 workouts.
    const start = windowStart({ lastImportedAt: null, importWindowDays: 30 }, now);

    assert.equal(start.toISOString(), '2026-07-14T12:00:00.000Z');
  });

  it('suit la fenêtre du serveur plutôt qu\'une constante du client', () => {
    // Elle doit pouvoir bouger sans publication sur les stores.
    const start = windowStart({ lastImportedAt: null, importWindowDays: 60 }, now);

    assert.equal(start.toISOString(), '2026-06-14T12:00:00.000Z');
  });

  it('repart du curseur, reculé d\'une marge', () => {
    // Une séance peut être écrite dans Santé après coup — un import Strava, une montre
    // synchronisée en différé. Redemander est gratuit, rater ne l'est pas.
    const start = windowStart(
      { lastImportedAt: '2026-08-13T09:00:00Z', importWindowDays: 30 },
      now,
    );

    assert.equal(start.toISOString(), '2026-08-13T08:00:00.000Z');
  });

  it('ne remonte jamais avant la fenêtre, même sur un vieux curseur', () => {
    // Ce qui est plus ancien ne rapporte rien et a déjà été archivé au premier import.
    const start = windowStart(
      { lastImportedAt: '2025-01-01T00:00:00Z', importWindowDays: 30 },
      now,
    );

    assert.equal(start.toISOString(), '2026-07-14T12:00:00.000Z');
  });

  it('traite un curseur illisible comme un premier lancement', () => {
    // Le choix le moins destructeur : au pire on renvoie ce que le serveur dédoublonnera, au
    // mieux on rattrape ce qu'un curseur cassé aurait fait manquer pour toujours.
    const start = windowStart({ lastImportedAt: 'pas une date', importWindowDays: 30 }, now);

    assert.equal(start.toISOString(), '2026-07-14T12:00:00.000Z');
  });
});
