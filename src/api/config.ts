import Constants from 'expo-constants';
import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

import { resolveApiBaseUrl } from '@/api/baseUrl';

interface SourceCodeModule extends TurboModule {
  getConstants(): { scriptURL: string };
}

/**
 * L'hôte de l'URL depuis laquelle le bundle JS a été chargé — posée par React Native lui-même,
 * pas par Expo. `hostUri` ne suffit pas seul : il ne vit que dans le manifeste qu'Expo Go va
 * chercher au lancement, et un dev client (`expo run:ios`, ce dépôt) ne passe jamais par là.
 *
 * Le module natif `SourceCode` porte cette adresse — c'est le même que React Native lit en
 * interne pour son propre `getDevServer` (`Libraries/Core/Devtools/getDevServer.js`). Il passe
 * par `TurboModuleRegistry` et pas par un accès direct à `NativeModules.SourceCode.scriptURL` :
 * sous la New Architecture, la façade `NativeModules` ne peuple plus ses constantes tant que
 * `getConstants()` n'a pas été appelée explicitement.
 */
const scriptURL: string | undefined = TurboModuleRegistry.get<SourceCodeModule>('SourceCode')?.getConstants()
  .scriptURL;

/**
 * L'adresse de l'API.
 *
 * Ce module ne fait que **lire** les entrées ; la règle qui les arbitre vit dans `baseUrl.ts`,
 * où elle se prouve sans Metro ni appareil.
 *
 * `EXPO_PUBLIC_API_URL` est **inlinée au build** par Metro : il n'y a pas de `process.env` à
 * l'exécution sur l'appareil, donc la lecture doit rester une propriété littérale — un accès
 * dynamique (`process.env[nom]`) ne serait pas remplacé et vaudrait `undefined`. La poser
 * dans `.env.local` (jamais versionnée) reste le moyen de viser autre chose que le back
 * local, et elle passe devant tout le reste.
 *
 * Sans elle, l'adresse **suit le serveur de développement** : `hostUri` ou, à défaut,
 * `scriptURL` portent l'hôte que Metro a donné au téléphone pour venir chercher le bundle, et
 * le back tourne sur ce même Mac. Plus d'IP LAN à recopier à chaque bail DHCP — c'est la même
 * machine, par construction.
 */
export const API_BASE_URL = resolveApiBaseUrl({
  configured: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
  scriptURL,
  isDev: __DEV__,
});
