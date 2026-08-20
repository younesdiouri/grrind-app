import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { deviceEnvironmentFrom, devicePlatformFrom } from '@/features/notifications/deviceEnvironment';
import { readExpoPushToken } from '@/features/notifications/pushToken';
import { registerDevice } from '@/features/notifications/registerDevice';

/**
 * Deux entrées, une seule sortie — et c'est la distinction du ticket #56.
 *
 * `reregisterIfAuthorized` ne demande **jamais** rien : elle relit l'autorisation déjà posée
 * (`getPermissionsAsync`), et s'arrête là si elle ne l'a pas. C'est celle que
 * `useDeviceRegistration` appelle à chaque démarrage — le jeton change (restauration de
 * sauvegarde, réinstallation) et le serveur ne l'apprend jamais autrement, mais rouvrir l'app
 * n'est pas un moment où demander quoi que ce soit.
 *
 * `requestPermissionAndRegister` pose la question (`requestPermissionsAsync`) avant
 * d'enregistrer. Elle n'a qu'un seul appelant : le chemin de succès de l'onglet Guilde
 * (`guilde.tsx`), juste après avoir fondé ou rejoint — le seul moment où une notification a un
 * sens assez évident pour justifier la feuille système, sachant qu'iOS ne la repose jamais si
 * elle essuie un refus.
 *
 * ————— Ce qui n'existe pas ici, et pourquoi ce n'est pas un oubli ——————————————————————
 *
 * Il n'y a pas d'`unregisterDevice`, et il n'y a pas de `DELETE /api/devices` dans le contrat
 * (`schema.d.ts` le dit : `delete?: never` sur `/api/devices`). Le back a livré la
 * déconnexion du jeton par le « chemin B » de son #136 : `POST /api/auth/logout` révoque toute
 * la famille de refresh tokens de l'appareil, et `LogOutHandler` révoque le jeton de push
 * attaché à cette même famille dans le même geste. Voir le docblock de `signOut` dans
 * `session.ts` — la déconnexion applicative suffit, ce module n'a rien de plus à faire.
 */

async function obtainAndRegister(): Promise<void> {
  const platform = devicePlatformFrom(Platform.OS);

  if (platform === null) {
    // Android (#15), web, ou toute autre plateforme sans jeton connu du contrat : rien à
    // envoyer.
    return;
  }

  const pushToken = await readExpoPushToken();

  if (pushToken === null) {
    return;
  }

  const apnsEnvironment = await Application.getIosPushNotificationServiceEnvironmentAsync();
  const environment = deviceEnvironmentFrom(apnsEnvironment);

  // Le résultat n'a rien à faire d'un écran : un échec ici (hors ligne, jeton mort) se
  // corrigera de lui-même au prochain démarrage — ce module est un meilleur effort, pas un
  // geste que l'utilisateur attend de voir aboutir.
  await registerDevice({ pushToken, platform, environment });
}

export async function reregisterIfAuthorized(): Promise<void> {
  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    return;
  }

  await obtainAndRegister();
}

export async function requestPermissionAndRegister(): Promise<void> {
  const permissions = await Notifications.requestPermissionsAsync();

  if (!permissions.granted) {
    return;
  }

  await obtainAndRegister();
}
