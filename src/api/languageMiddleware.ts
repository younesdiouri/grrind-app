import type { Middleware } from 'openapi-fetch';

/**
 * Le middleware de langue : il pose `Accept-Language` sur toute requête qui n'en porte pas déjà.
 *
 * Aucune dépendance d'exécution, comme `authMiddleware.ts` — c'est ce qui permet de le prouver
 * sous `node --test`, sur un `fetch` qui capture ce qui part, sans monter Expo.
 */

/**
 * `fr-FR, fr;q=0.9`, et pas une lecture d'`expo-localization`.
 *
 * GRRIND n'a qu'une traduction et aucun sélecteur de langue : les dates sont déjà formatées en
 * `fr-FR` en dur à quatre endroits (`progression/format.ts`, `community/format.ts`). Demander au
 * serveur la langue de l'appareil pendant que les dates restent françaises quoi qu'il arrive
 * produirait un écran à moitié traduit — un titre en allemand au-dessus d'un « 12 mars ». Tant
 * qu'il n'y a pas de seconde traduction, la seule chose honnête est d'assumer celle qu'on a. Le
 * jour où une deuxième langue arrive, les dates et cette constante bougent ensemble.
 */
export const ACCEPT_LANGUAGE = 'fr-FR, fr;q=0.9';

export function createLanguageMiddleware(): Middleware {
  return {
    onRequest({ request }) {
      // Un en-tête déjà posé sur l'appel n'est pas écrasé : personne n'en pose aujourd'hui, mais
      // un en-tête de transport qui remplacerait ce qu'on lui donne est un piège qu'on ne
      // redécouvre qu'une fois.
      if (!request.headers.has('Accept-Language')) {
        request.headers.set('Accept-Language', ACCEPT_LANGUAGE);
      }

      return request;
    },
  };
}
