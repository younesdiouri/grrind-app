import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { createBatchKeys, type BatchKeys, type KeyRecord } from '@/features/health/batchKey';

/**
 * L'`Idempotency-Key` d'un combat — et ici, elle ne se rattrape sur rien.
 *
 * ————— Pourquoi c'est plus critique qu'à l'import ——————————————————————————————————————
 *
 * À l'import, la clé a un **doublon de sécurité** côté serveur : l'unicité `(source,
 * externalId)` empêche le double crédit même si la clé était mal gérée. Une clé neuve par
 * tentative y coûte la mise en scène, pas l'XP.
 *
 * Un combat n'a **aucune unicité naturelle**. Rien ne distingue deux combats contre le même
 * adversaire, et le tirage est aléatoire : une clé neuve sur un rejeu réseau produit un
 * *second* combat, écrit en base, avec une autre issue. Le joueur regarde alors une animation
 * qui n'est pas celle qui a été enregistrée — et il le découvre en rouvrant son historique, où
 * deux lignes l'attendent au lieu d'une.
 *
 * ————— Pourquoi le mécanisme est réutilisé et non réécrit ——————————————————————————————
 *
 * `createBatchKeys` n'a rien de propre aux séances : c'est un appariement `clé ↔ empreinte`,
 * sérialisé, sans aucune dépendance d'exécution. Ce qui change d'un cas à l'autre, c'est ce que
 * l'empreinte **désigne** et ce qu'une erreur **coûte** — les deux sont écrits ici, pas là-bas.
 * En réécrire une copie donnerait deux mécanismes à garder justes au lieu d'un, et c'est
 * précisément le genre de duplication qui diverge à la première correction.
 *
 * ————— Ce que l'empreinte désigne ici ————————————————————————————————————————————————
 *
 * L'**intention** — l'adversaire choisi, ou son absence — et non un lot. Voir `keyPolicy.ts`,
 * qui porte cette règle et celle de l'effacement, toutes deux sans une ligne d'Expo pour
 * qu'elles se prouvent sous `node --test`. Ce fichier-ci ne décide de rien : il range.
 */

const RECORD_KEY = 'grrind.battle.idempotency';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'app.grrind.combat',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/**
 * Relit un enregistrement, sans lui faire confiance.
 *
 * Même prudence que le trousseau de l'import — une version précédente de l'app a pu écrire
 * autre chose. Mais **la conséquence n'est pas la même**, et il faut le dire : là-bas, une
 * relecture ratée fait au pire frapper une clé neuve sur un lot que le serveur dédoublonnera.
 * Ici, elle fait perdre le rejeu, donc potentiellement livrer un second combat.
 *
 * On rend quand même `null` : un enregistrement qu'on ne sait pas lire ne peut pas être renvoyé
 * au serveur, et une clé inventée à partir d'un JSON tronqué vaudrait un 409. Le cas est celui
 * d'une mise à jour d'app, pas d'un fonctionnement normal.
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
 * Le trousseau du combat en cours.
 *
 * Singleton de module, et **trousseau distinct de celui de l'import** : les deux écritures
 * n'ont rien à voir, et les mélanger ferait qu'une synchronisation en vol écraserait la clé
 * d'un combat en vol.
 */
export const battleKeys: BatchKeys = createBatchKeys({
  read,
  write: (record) => SecureStore.setItemAsync(RECORD_KEY, JSON.stringify(record), OPTIONS),
  erase: () => SecureStore.deleteItemAsync(RECORD_KEY, OPTIONS),
  mint: () => Crypto.randomUUID(),
});
