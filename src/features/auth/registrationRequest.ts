import type { components } from '@/api/schema';

type RegisterRequest = components['schemas']['RegisterRequest'];

/**
 * Les champs saisis par l'écran. `timezone` reste le fuseau IANA de l'appareil : le serveur y
 * arbitre le streak et le plafond quotidien, sans jamais tenter de le déduire lui-même.
 */
export type RegisterInput = Omit<RegisterRequest, 'locale'>;

/**
 * L'interface est encore entièrement francophone : le profil persiste donc la même langue que
 * celle annoncée par `Accept-Language`, au lieu de laisser le serveur choisir par défaut.
 */
export function registrationRequest(input: RegisterInput): RegisterRequest {
  return { ...input, locale: 'fr' };
}
