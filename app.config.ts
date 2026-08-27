import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * La variante de build, et la seule chose qu'elle décide.
 *
 * ————— Pourquoi elle existe (#83) ——————————————————————————————————————————————————————
 *
 * Le build de développement et celui de TestFlight portaient le **même** `bundleIdentifier`.
 * iOS n'accepte qu'une app par identifiant : installer l'une désinstallait l'autre. On passait
 * donc son temps à supprimer et réinstaller, et à chaque fois tout ce qu'iOS attache à l'app
 * repartait de zéro — autorisations Santé, autorisation de notification, Keychain, jeton de
 * push.
 *
 * Ce n'était pas seulement inconfortable, ça rendait les tests **inexploitables** : on ne
 * savait jamais si un comportement venait du code ou de l'état neuf d'une app tout juste
 * réinstallée. Le défaut d'autorisation du #81 s'est caché là-derrière pendant des semaines.
 *
 * ————— La forme : `app.json` reste la base ————————————————————————————————————————————
 *
 * Ce fichier ne remplace pas `app.json`, il le **reçoit** (`ConfigContext.config`) et n'écrase
 * que ce que la variante change. La configuration de l'app reste donc lisible d'un seul coup
 * d'œil dans un fichier statique, et ce qui suit ne décrit que la différence — c'est ce qu'on
 * veut relire dans six mois, pas une copie complète qui aurait divergé.
 *
 * Une seule variable d'environnement, pas un système : `APP_VARIANT=development`, ou rien.
 * Posée par le profil `development` d'`eas.json` et par le script `npm run ios`.
 */
const isDevelopmentVariant = process.env.APP_VARIANT === 'development';

/**
 * L'identifiant de la variante de dev.
 *
 * `extra.eas.projectId` **ne bouge pas** : un seul projet EAS, deux identifiants applicatifs,
 * c'est le cas normal — et `readExpoPushToken` (`src/features/notifications/pushToken.ts`) le
 * lit pour obtenir un jeton, donc le changer casserait le push des deux côtés.
 */
const DEV_IDENTIFIER = 'app.grrind.dev';

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!isDevelopmentVariant) {
    return config as ExpoConfig;
  }

  return {
    ...(config as ExpoConfig),
    name: 'GRRIND dev',
    /**
     * **Le schéma change aussi, et ce n'est pas un détail cosmétique.** Deux apps installées
     * qui répondent toutes les deux à `grrindapp://`, c'est iOS qui choisit laquelle ouvre un
     * lien — et il ne dit pas laquelle, ni ne s'en explique. Le jour où un lien de partage de
     * guilde ouvrira la mauvaise, on cherchera longtemps.
     */
    scheme: 'grrindapp-dev',
    /**
     * Une icône visiblement différente, par le mécanisme d'Apple Icon Composer lui-même : le
     * même bundle, avec un dégradé ambre au lieu du bleu. Deux apps indiscernables sur
     * l'écran d'accueil, c'était déjà la moitié du problème qu'on répare ici.
     */
    icon: './assets/expo-dev.icon',
    ios: {
      ...config.ios,
      bundleIdentifier: DEV_IDENTIFIER,
      icon: './assets/expo-dev.icon',
      entitlements: {
        ...config.ios?.entitlements,
        /**
         * ————— `aps-environment`, et ce qui a été vérifié ————————————————————————————
         *
         * `app.json` le figeait à `development` pour **les deux** profils. C'était faux pour
         * ce qui part au store, et la documentation SDK 57 ne tranche pas : elle décrit
         * `ios.entitlements` comme « un dictionnaire arbitraire ajouté au fichier
         * `.entitlements` », sans dire ce qu'EAS écrit par-dessus à la signature.
         *
         * Ce qui tranche, c'est le dépôt. `deviceEnvironment.ts` raconte un déploiement où
         * les appareils TestFlight se sont enregistrés en `DEVELOPMENT`, où
         * `PUSH_TARGET_ENVIRONMENT=PRODUCTION` les a écartés à l'envoi, et où le correctif
         * — traiter l'absence de profil comme `PRODUCTION` — a fait repartir les annonces.
         * Or `expo-notifications` choisit son canal APNs sur le **profil de provisionnement**,
         * pas sur cet entitlement ; et une notification de production n'atteindrait pas un
         * binaire signé `development`. Les deux ensemble ne laissent qu'une lecture : le
         * binaire TestFlight embarque bien `production`, quoi qu'ait dit `app.json`.
         *
         * `app.json` porte donc désormais `production`, et la variante de dev remet
         * `development` ici. La déclaration dit enfin ce qui est réellement signé.
         *
         * **Ce qui reste à vérifier** : que le prochain build TestFlight reçoit toujours ses
         * notifications. Si ce n'était pas le cas, le retour en arrière tient en une ligne —
         * remettre `development` dans `app.json`.
         */
        'aps-environment': 'development',
      },
    },
    android: {
      ...config.android,
      package: DEV_IDENTIFIER,
    },
  };
};
