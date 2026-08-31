import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { createActionKeys, type ActionKeyRecord, type ActionKeys } from './actionKeys.ts';

const RECORD_KEY = 'grrind.shop.action-keys';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'app.grrind.shop',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** Ne relit que les paires sûres à rejouer : un trousseau d'une ancienne version reste opaque. */
async function read(): Promise<ActionKeyRecord> {
  const raw = await SecureStore.getItemAsync(RECORD_KEY, OPTIONS);
  if (raw === null) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

/**
 * Les clés d'achat et d'ouverture encore sans verdict.
 *
 * Un seul trousseau, mais une entrée par intention : une demande réseau incertaine ne doit pas
 * être oubliée parce que le joueur a navigué vers un autre objet.
 */
export const shopActionKeys: ActionKeys = createActionKeys({
  read,
  write: (record) => SecureStore.setItemAsync(RECORD_KEY, JSON.stringify(record), OPTIONS),
  mint: () => Crypto.randomUUID(),
});
