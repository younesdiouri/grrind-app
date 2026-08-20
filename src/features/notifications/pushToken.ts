import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

/**
 * Le jeton de push Expo — ou `null` s'il n'y a rien à en tirer.
 *
 * `projectId` n'est **pas** déduit hors d'Expo Go : `getExpoPushTokenAsync` en a besoin
 * explicitement, et il vit dans `app.json` (`extra.eas.projectId`), lu ici via
 * `expo-constants` plutôt qu'en important le fichier de config directement — c'est la
 * frontière que `Constants.expoConfig` existe pour tenir.
 *
 * `null` couvre deux choses qu'il n'y a pas lieu de distinguer ici : `projectId` absent de la
 * config (un build mal formé, pas le problème de ce module) et un appel qui échoue (hors
 * ligne, panne des serveurs Expo). Dans les deux cas, l'appelant n'a rien à afficher — voir
 * `registration.ts`, qui traite ce module en meilleur effort.
 */
export async function readExpoPushToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  if (typeof projectId !== 'string') {
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}
