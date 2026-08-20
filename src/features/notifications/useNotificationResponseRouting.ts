import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { handleNotificationResponse } from '@/features/notifications/pushRouting';

/**
 * Deux des trois chemins de réception d'une notification — le troisième, la bannière au
 * premier plan, est `foregroundHandler.ts`, posé au chargement du module et pas ici.
 *
 * Monté une fois par `app/_layout.tsx`, **avant** la garde de session : un tap peut arriver
 * pendant que le trousseau restaure encore, et `handleNotificationResponse` sait déjà quoi en
 * faire dans ce cas (la file d'attente de `pendingPushRoute.ts`).
 *
 * ————— Tap, arrière-plan ou app déjà lancée —————————————————————————————————————————————
 *
 * `addNotificationResponseReceivedListener` vit pour la durée du process : `RootLayout` ne se
 * démonte jamais tant que l'app tourne, donc pas de réabonnements à répétition à craindre.
 *
 * ————— Tap, app fermée ——————————————————————————————————————————————————————————————————
 *
 * Le listener ci-dessus n'a pas encore été monté quand le système a livré la réponse qui a
 * lancé le process : `getLastNotificationResponseAsync` la rend une fois, ici, au démarrage.
 * `clearLastNotificationResponse` efface aussitôt après l'avoir lue — sans ça, le double
 * montage de React en développement, ou une réouverture ultérieure de l'app, rejouerait le
 * même tap. `handleNotificationResponse` consomme donc chaque réponse **une** fois, quel que
 * soit le chemin qui l'a livrée.
 */
export function useNotificationResponseRouting(): void {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response !== null) {
        handleNotificationResponse(response);
        Notifications.clearLastNotificationResponse();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
