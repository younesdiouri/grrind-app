import type { components } from '@/api/schema';

export type DevicePlatform = components['schemas']['DevicePlatform'];
export type DeviceEnvironment = components['schemas']['DeviceEnvironment'];

/**
 * `Platform.OS` traduit vers ce que le contrat attend — pas un `'IOS'` en dur.
 *
 * **Android tombe sur `null`, jusqu'au #15.** Ce n'est pas un oubli : `deviceEnvironmentFrom`,
 * juste en dessous, n'a pas d'équivalent Android à `aps-environment`, et un enregistrement
 * partiel — un jeton FCM envoyé sans savoir de quel canal il sort — serait pire que ne rien
 * envoyer. `registration.ts` s'arrête donc net sur ce `null`, comme `current.ts` s'arrête sur
 * `isAvailable() → false` côté santé.
 */
export function devicePlatformFrom(osName: string): DevicePlatform | null {
  return osName === 'ios' ? 'IOS' : null;
}

/**
 * Le canal de build qui a émis le jeton, jamais le mode de la session JS.
 *
 * Le champ ne demande pas si l'app tourne en `__DEV__` : un jeton de push est produit par le
 * binaire compilé, pas par le bundle JS qu'il exécute, et un build de dev peut très bien
 * charger un bundle de production pendant un test. La seule source fiable est l'entitlement
 * `aps-environment` embarqué dans le binaire lui-même — c'est lui qu'Apple regarde pour router
 * la notification, et c'est lui que `Application.getIosPushNotificationServiceEnvironmentAsync`
 * lit (`registration.ts`). Sans ce champ, une campagne de production irait aussi aux
 * téléphones des développeurs, qui tournent tous un binaire en environnement `development`.
 *
 * `null` — le simulateur, qui ne peut pas s'enregistrer auprès d'APNs — se range avec
 * `'development'` : c'est la valeur prudente, celle qui ne peut jamais faire atterrir une
 * campagne de production sur un canal dont on ne sait rien.
 */
export function deviceEnvironmentFrom(
  apnsEnvironment: 'development' | 'production' | null,
): DeviceEnvironment {
  return apnsEnvironment === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
}
