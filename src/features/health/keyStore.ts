import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { createBatchKeys, type BatchKeys, type KeyRecord } from '@/features/health/batchKey';

/**
 * Où vit la clé d'idempotence du lot, et pourquoi elle survit à la mort de l'app.
 *
 * **C'est la persistance qui fait le mécanisme.** Une clé en mémoire disparaît exactement dans
 * le cas qu'elle est censée couvrir : l'app tuée pendant que l'import était en vol. Au
 * redémarrage, le client redemande son curseur au serveur — qui n'a pas bougé, puisque la
 * réponse n'est jamais arrivée — reconstruit le même lot, et doit pouvoir renvoyer la **même**
 * clé pour récupérer la réponse d'origine plutôt qu'une synchronisation vide.
 *
 * `expo-secure-store` plutôt qu'autre chose : c'est le seul magasin persistant déjà embarqué, la
 * valeur tient en quelques dizaines d'octets, et son `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` a ici
 * un effet heureux — une sauvegarde restaurée sur un autre appareil n'y ramène pas une clé qui
 * ne correspond à rien. Ce n'est pas un secret pour autant : c'est une note que le client se
 * laisse à lui-même.
 *
 * Le trousseau est **distinct de celui de l'authentification** : une déconnexion vide l'un sans
 * toucher l'autre.
 */

const RECORD_KEY = 'grrind.sync.idempotency';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'app.grrind.health',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/**
 * Relit un enregistrement, sans lui faire confiance.
 *
 * Une version précédente de l'app a pu écrire autre chose, et un JSON tronqué reste possible.
 * Dans le doute on rend `null` : le pire qui puisse arriver est de frapper une clé neuve pour un
 * lot sur lequel **aucun import n'est parti** — ce qui ne double rien, le serveur dédoublonnant
 * de toute façon sur `externalId`.
 */
async function read(): Promise<KeyRecord | null> {
  const raw = await SecureStore.getItemAsync(RECORD_KEY, OPTIONS);
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const { key, fingerprint } = parsed as Partial<KeyRecord>;
    if (typeof key !== 'string' || typeof fingerprint !== 'string') {
      return null;
    }

    return { key, fingerprint };
  } catch {
    return null;
  }
}

/**
 * Le trousseau du lot en cours.
 *
 * Singleton de module, comme la session d'authentification et pour la même raison : il n'y a
 * qu'un appareil, donc qu'un enregistrement, et deux instances qui liraient le même trousseau
 * chacune de son côté rouvriraient la fenêtre que la sérialisation ferme.
 */
export const batchKeys: BatchKeys = createBatchKeys({
  read,
  write: (record) => SecureStore.setItemAsync(RECORD_KEY, JSON.stringify(record), OPTIONS),
  erase: () => SecureStore.deleteItemAsync(RECORD_KEY, OPTIONS),
  mint: () => Crypto.randomUUID(),
});
