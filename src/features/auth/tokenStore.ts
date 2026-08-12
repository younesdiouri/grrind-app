import * as SecureStore from 'expo-secure-store';

/**
 * Où vivent les deux jetons, et pourquoi pas au même endroit.
 *
 * - Le **JWT** reste en mémoire. Il dure quinze minutes et ne se révoque pas : le persister
 *   n'apporterait rien — au redémarrage il serait périmé une fois sur deux, et il faudrait
 *   rafraîchir de toute façon — et l'exposerait sur disque pour rien.
 * - Le **refresh token** va dans le trousseau via `expo-secure-store`, jamais dans
 *   `AsyncStorage`. C'est lui qui vaut la session : il est long, rotatif, et suffit à ouvrir
 *   l'appareil.
 */

const REFRESH_TOKEN_KEY = 'grrind.refreshToken';

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

/** Le JWT. En mémoire, et seulement là. */
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
