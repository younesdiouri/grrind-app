import * as SecureStore from 'expo-secure-store';

import { parseStoredSession, type StoredSession } from '@/features/auth/storedSession';

/**
 * Où vivent les jetons, et pourquoi pas au même endroit.
 *
 * - Le **JWT** vit en mémoire pour la durée du process — c'est de là que le middleware le lit
 *   à chaque requête — et il est **aussi** persisté, avec son instant d'expiration, depuis le
 *   `#146`. Le raisonnement d'origine (« au redémarrage il serait périmé une fois sur deux »)
 *   était juste sur la moitié des cas et coûtait, sur l'autre moitié, une rotation entière du
 *   refresh token à chaque naissance de process. Or c'est la rotation qui perd les sessions,
 *   pas le jeton d'accès sur le disque : voir le docblock de `storedSession.ts`. Il est donc
 *   rangé avec la même clé de protection que le refresh token — c'est un porteur de session,
 *   il ne va pas ailleurs.
 * - Le **refresh token** va dans le trousseau via `expo-secure-store`, jamais dans
 *   `AsyncStorage`. C'est lui qui vaut la session : il est long, rotatif, et suffit à ouvrir
 *   l'appareil.
 *
 * **Deux items, pas un seul objet.** Le refresh token garde sa clé et sa forme d'origine : un
 * appareil déjà installé au moment de la mise à jour retrouve sa session telle quelle, et
 * l'absence du second item — le cas de tous les appareils au premier lancement de cette
 * version — est simplement le chemin d'avant, la rotation.
 */

const REFRESH_TOKEN_KEY = 'grrind.refreshToken';
const SESSION_KEY = 'grrind.session';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'app.grrind.auth',
  /**
   * Lisible après le premier déverrouillage — donc par une tâche de fond — et **jamais
   * migré vers un autre appareil** lors d'une restauration de sauvegarde.
   *
   * Ce second point n'est pas de la prudence en l'air : une famille de refresh tokens *est*
   * un appareil. Le même jeton restauré sur un deuxième téléphone, c'est exactement le rejeu
   * que le back lit comme un vol — et il révoque la famille, donc les deux appareils.
   */
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** Le JWT du process courant. Ce que le middleware lit à chaque requête. */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, OPTIONS);
}

export function writeRefreshToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, OPTIONS);
}

export function clearRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, OPTIONS);
}

/**
 * La session reprenable — jeton d'accès, expiration, profil. `null` : aucune, ou une forme que
 * cette version ne sait pas relire (voir `parseStoredSession`).
 *
 * Un rejet remonte tel quel, comme pour `readRefreshToken()` : un trousseau qui n'a pas répondu
 * n'est pas un trousseau vide, et c'est à l'appelant de décider ce que ça veut dire (#142).
 */
export async function readStoredSession(): Promise<StoredSession | null> {
  return parseStoredSession(await SecureStore.getItemAsync(SESSION_KEY, OPTIONS));
}

export function writeStoredSession(session: StoredSession): Promise<void> {
  return SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), OPTIONS);
}

export function clearStoredSession(): Promise<void> {
  return SecureStore.deleteItemAsync(SESSION_KEY, OPTIONS);
}
