import { router } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';

import { getState } from '@/features/auth/session';
import { markInteracted } from '@/features/reward/launchGate';
import { setPendingPushRoute } from '@/features/notifications/pendingPushRoute';
import { decodePushRouteTarget, type PushRouteTarget } from '@/features/notifications/pushRouteTarget';

/**
 * La cible décodée, poussée sur le routeur.
 *
 * La seule cible du contrat aujourd'hui est `PLAYER_PROFILE` → `/joueur/{id}`, la route
 * livrée au #119. `routeId` est l'auteur de la séance, pas un id de notification : c'est ce
 * que `GET /api/players/{id}` attend.
 */
function hrefFor(target: PushRouteTarget) {
  switch (target.type) {
    case 'PLAYER_PROFILE':
      return { pathname: '/joueur/[id]', params: { id: target.routeId } } as const;
  }
}

export function routeTo(target: PushRouteTarget): void {
  router.push(hrefFor(target));
}

/**
 * Le point de convergence des trois chemins de réception — c'est la règle du ticket #57 :
 * **une seule** fonction de routage, jamais deux implémentations qui pourraient diverger.
 * `useNotificationResponseListener` (arrière-plan, app déjà lancée) et
 * `useLastNotificationResponse` (app fermée) y mènent toutes les deux.
 *
 * ————— Le tap gagne sur la récompense qui attend ————————————————————————————————————————
 *
 * Une notification qui décode vers une cible connue est une **intention explicite** : le
 * joueur vient de demander un profil précis, pas sa propre progression. Sans `markInteracted`,
 * le portillon de lancement (`usePendingReward`) ouvrirait par-dessus une récompense laissée
 * en attente par une synchronisation de fond — la récompense n'est pas perdue, elle attend
 * simplement le prochain lancement, où elle sera de nouveau prioritaire.
 *
 * ————— La session, pas le routeur ——————————————————————————————————————————————————————
 *
 * `/joueur/{id}` vit sous `(app)`, monté seulement une fois `signedIn` : router dessus avant
 * retomberait sur la garde de `app/_layout.tsx` et perdrait le tap. `getState()` — le magasin
 * de session, pas un hook — est donc lu directement, hors du rendu : cette fonction est
 * appelée depuis un listener natif, jamais depuis un composant.
 */
export function handleNotificationResponse(response: NotificationResponse): void {
  const target = decodePushRouteTarget(response.notification.request.content.data);

  if (target === null) {
    return;
  }

  markInteracted();

  if (getState().status === 'signedIn') {
    routeTo(target);
    return;
  }

  // La session restaure encore, ou personne n'est connecté pour l'instant : la cible attend
  // et sera consommée **une fois**, dès que `signedIn` arrive (`usePendingPushRoute`).
  setPendingPushRoute(target);
}
