import Constants from 'expo-constants';

import { resolveApiBaseUrl } from '@/api/baseUrl';

/**
 * L'adresse de l'API.
 *
 * Ce module ne fait que **lire** les trois entrées ; la règle qui les arbitre vit dans
 * `baseUrl.ts`, où elle se prouve sans Metro ni appareil.
 *
 * `EXPO_PUBLIC_API_URL` est **inlinée au build** par Metro : il n'y a pas de `process.env` à
 * l'exécution sur l'appareil, donc la lecture doit rester une propriété littérale — un accès
 * dynamique (`process.env[nom]`) ne serait pas remplacé et vaudrait `undefined`. La poser
 * dans `.env.local` (jamais versionnée) reste le moyen de viser autre chose que le back
 * local, et elle passe devant tout le reste.
 *
 * Sans elle, l'adresse **suit le serveur de développement** : `hostUri` porte l'hôte que
 * Metro a donné au téléphone pour venir chercher le bundle, et le back tourne sur ce même
 * Mac. Plus d'IP LAN à recopier à chaque bail DHCP — c'est la même machine, par construction.
 */
export const API_BASE_URL = resolveApiBaseUrl({
  configured: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  isDev: __DEV__,
});
