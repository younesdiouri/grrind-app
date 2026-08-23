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
 * **`null` vaut `PRODUCTION`, et c'est le seul défaut correct.** L'API lit
 * `embedded.mobileprovision` — pas l'entitlement du binaire — et ce profil n'est pas lisible
 * dans une app livrée par TestFlight ou l'App Store : Apple resigne, et `expo-application`
 * traite lui-même l'absence de profil comme « App Store » dans son `appReleaseType`. Un
 * build de store rend donc `null`, jamais `'production'`.
 *
 * C'est exactement la convention d'`expo-notifications`, et ce n'est pas une coïncidence à
 * maintenir de tête : `shouldUseDevelopmentNotificationService` ne bascule que sur un
 * `'development'` explicite, `null` compris comme production. C'est cette décision-là qui
 * détermine à quel canal APNs Expo enregistre le jeton — ce champ doit donc dire la même
 * chose qu'elle, sous peine de décrire un jeton autrement qu'il n'existe.
 *
 * Traiter `null` comme « prudent » a coûté un déploiement : les deux appareils TestFlight se
 * sont enregistrés en `DEVELOPMENT`, `PUSH_TARGET_ENVIRONMENT=PRODUCTION` les a écartés à
 * l'envoi, et aucune annonce de guilde n'est partie alors que toute la chaîne serveur avait
 * fonctionné jusqu'au dernier maillon.
 *
 * Le simulateur, lui, n'atteint jamais cette fonction : il ne peut pas produire de jeton, donc
 * `readExpoPushToken` rend `null` et `registration.ts` s'arrête avant.
 */
export function deviceEnvironmentFrom(
  apnsEnvironment: 'development' | 'production' | null,
): DeviceEnvironment {
  return apnsEnvironment === 'development' ? 'DEVELOPMENT' : 'PRODUCTION';
}
