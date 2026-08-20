import * as Notifications from 'expo-notifications';

/**
 * La bannière au premier plan.
 *
 * Sans ce handler, une notification qui arrive pendant que l'app est ouverte ne s'affiche
 * **jamais** — c'est le comportement par défaut d'iOS, pas un oubli à corriger côté back.
 *
 * `setNotificationHandler` est appelé **au chargement du module**, pas dans un `useEffect` :
 * il doit être en place avant qu'une notification arrive, et un composant qui n'a pas encore
 * eu son premier rendu ne garantit rien de ce côté. Ce fichier n'exporte donc rien — son
 * import (`app/_layout.tsx`, pour son seul effet de bord) est la seule chose qui compte, au
 * même titre que `SplashScreen.preventAutoHideAsync()` juste au-dessus de lui.
 *
 * `shouldShowBanner`/`shouldShowList` remplacent `shouldShowAlert` au SDK 57 — voir
 * https://docs.expo.dev/versions/v57.0.0/sdk/notifications/. Le son suit le réglage système
 * de la catégorie, GRRIND n'a pas son mot à dire dessus ; le badge n'a pas d'usage ici.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
