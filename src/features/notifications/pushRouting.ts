import { router } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';

import { getState } from '@/features/auth/session';
import { markInteracted } from '@/features/reward/launchGate';
import { setPendingPushRoute } from '@/features/notifications/pendingPushRoute';
import { decodePushRouteTarget, type PushRouteTarget } from '@/features/notifications/pushRouteTarget';

/**
 * La cible décodée, poussée sur le routeur.
 *
 * `PLAYER_PROFILE` → `/joueur/{id}`, la route livrée au #119. `routeId` est l'auteur de la
 * séance, pas un id de notification : c'est ce que `GET /api/players/{id}` attend.
 *
 * `GUILD_RISALAT` → `/guilde`. Le contrat dit que `routeId` porte l'identifiant de la guilde,
 * mais `GET /api/guilds/mine/risalat` n'accepte aucun identifiant : un compte appartient à une
 * seule guilde, la destination est unique, il n'y a donc rien à résoudre. `routeId` est décodé
 * sans être consommé — le jour où un compte en aura plusieurs, la route saura déjà laquelle
 * ouvrir.
 *
 * Le `switch` est exhaustif **par construction**, comme `unnamedProblem` dans
 * `src/features/auth/problems.ts` : son `default` passe `target.type` à une fonction qui
 * n'accepte que `never`. Le jour où le back ajoute une valeur à `PushRouteType`, le client ne
 * compile plus tant qu'un cas n'a pas été écrit ici — c'est le seul endroit du client qui
 * décide où mène un `routeType`, et une addition qui n'y aurait pas de cas ne doit pas passer
 * inaperçue.
 */
function hrefFor(target: PushRouteTarget) {
  switch (target.type) {
    case 'PLAYER_PROFILE':
      return { pathname: '/joueur/[id]', params: { id: target.routeId } } as const;
    case 'GUILD_RISALAT':
      return { pathname: '/guilde' } as const;
    default:
      return unroutablePushRouteType(target.type);
  }
}

/**
 * Le repli sur un `routeType` que ce client ne connaît pas.
 *
 * Le paramètre est typé `never` : à la compilation, il ne peut recevoir que l'ensemble vide,
 * donc ajouter une valeur à `PushRouteType` casse le build ici. À l'exécution, ce cas ne se
 * présente pas — `decodePushRouteTarget` a déjà écarté tout `routeType` qu'il ne reconnaît
 * pas — donc l'unique rôle de cette fonction est de faire échouer `npm run typecheck`, pas de
 * gérer un cas réel.
 */
function unroutablePushRouteType(type: never): never {
  throw new Error(`routeType non routable : ${String(type)}`);
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
