import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { enableBackgroundWakeup, startBackgroundWakeup } from '@/features/health/backgroundWakeup';
import { sendDailyActivity } from '@/features/health/dailyActivity';
import { healthProvider } from '@/features/health/current';
import { getSyncStatus, subscribeToSync, sync, type SyncStatus } from '@/features/health/sync';

/**
 * Les quatre déclencheurs de la synchronisation, et rien de plus.
 *
 * - **À l'ouverture de l'app**, une fois l'authentification établie. Pas avant : l'import est
 *   une route `Bearer`, et la déclencher sans jeton ferait partir un 401 qui brûlerait un
 *   rafraîchissement pour rien.
 * - **Au retour au premier plan** (`AppState` → `active`). Le seuil vit dans le coordinateur,
 *   pas ici : c'est une règle de synchronisation, pas une règle de React.
 * - **Manuellement**, par un geste de rafraîchissement. C'est le filet quand tout le reste a
 *   raté, donc il **ignore le seuil**.
 * - **Le réveil HealthKit** (#55), automatique comme les deux premiers — même seuil de trente
 *   secondes, lui non plus ne l'ignore pas.
 *
 * **L'énergie active quotidienne** (#77) part sur les mêmes déclencheurs, sans en ajouter un
 * cinquième. Elle n'emprunte rien de la mécanique d'import — ni coordinateur, ni seuil, ni clé
 * d'idempotence : `PUT /api/daily-activity` est idempotent par nature, et la journée en cours
 * est **révisable**, donc la renvoyer est ce qu'on veut. Elle n'est pas enchaînée derrière
 * l'import non plus : elle n'en dépend pas, et l'attendre retarderait la mise en scène pour une
 * donnée que personne ne regarde dans la seconde.
 *
 * **Ce hook ne joue toujours rien.** C'était vrai en V1 faute de tâche de fond ; c'est resté
 * vrai en ajoutant le réveil, pour une raison différente : une synchronisation qu'on ne peut
 * pas expliquer à l'utilisateur — parce qu'il n'a pas les yeux sur l'écran — produirait des
 * animations qui se déclenchent dans le vide, ou pire, une progression déjà jouée quand il
 * ouvre l'app. Le réveil écrit donc sur le disque (`pending.ts`) exactement comme les trois
 * autres, et c'est le portillon de lancement (`launchGate.ts`) qui décide, à l'ouverture
 * suivante, de jouer ce qui attend.
 *
 * Ce hook ne **détient** rien. L'état vit dans `sync.ts`, hors de l'arbre, comme la session
 * d'authentification et pour la même raison : la synchronisation survit au démontage de
 * l'écran qui l'a lancée, et deux écrans doivent voir le même état sans se le passer.
 *
 * Il est monté par la **coquille de l'app**, pas par un écran. Il l'était par l'écran Santé,
 * ce qui voulait dire qu'ouvrir l'app sans y passer ne synchronisait jamais : le joueur
 * devait aller chercher sa propre progression.
 */
export function useSyncTriggers(): void {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';

  const run = useCallback(
    (trigger: Parameters<typeof sync>[0]) => {
      if (!signedIn) {
        return;
      }

      void sync(trigger);

      // L'énergie active part **avec** les mêmes déclencheurs, pas sur un cinquième (#77). Ce
      // n'est pas une synchronisation : pas de coordinateur, pas de seuil, pas de clé
      // d'idempotence — `PUT /api/daily-activity` est idempotent par nature, et la journée en
      // cours est révisable, donc la renvoyer est le comportement voulu et non un doublon.
      //
      // Elle n'est pas non plus enchaînée derrière l'import : elle n'en dépend pas, et
      // l'attendre retarderait la mise en scène pour une donnée que personne ne regarde tout
      // de suite. Meilleur effort, silencieux — voir `dailyActivity.ts`.
      void sendDailyActivity();
    },
    [signedIn],
  );

  // 1. L'ouverture. `signedIn` en dépendance fait aussi office de déclencheur après une
  //    connexion : le premier écran d'un compte neuf synchronise sans qu'on ait à l'appeler.
  useEffect(() => {
    run('launch');
  }, [run]);

  // 2. Le retour au premier plan.
  useEffect(() => {
    const onChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        run('foreground');
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [run]);

  // 4. Le réveil HealthKit. Pas de branche « manual » ici : ce déclencheur-là n'existe que
  //    par un geste, il n'a pas de pendant automatique à monter.
  useEffect(() => {
    if (!signedIn) {
      return;
    }

    // `enableBackgroundDelivery` échoue tant que HealthKit n'a rien accordé — voir
    // `backgroundWakeup.ios.ts`. On ne le tente donc qu'une fois l'autorisation posée, ce que
    // seul `authorizationPrompt()` sait dire ; le rappeler à chaque lancement ne coûte rien,
    // c'est idempotent côté natif, et c'est le seul moyen de s'inscrire sans revenir sur
    // l'écran Santé après avoir accordé l'accès. `authorizationPrompt()` rejette sans
    // fournisseur (un iPad, par exemple) — dans ce cas il n'y a de toute façon rien à activer.
    healthProvider
      .authorizationPrompt()
      .then((prompt) => {
        if (prompt === 'alreadyAsked') {
          void enableBackgroundWakeup();
        }
      })
      .catch(() => undefined);

    return startBackgroundWakeup();
  }, [signedIn]);
}

/**
 * Lire l'état, et le redemander.
 *
 * Séparé des déclencheurs **exprès** : ceux-ci vivent dans la coquille de l'app et n'y sont
 * montés qu'une fois, alors que plusieurs écrans veulent lire le résultat. Fondre les deux
 * ferait partir une synchronisation de plus à chaque écran qui s'ouvre — ce que le
 * coordinateur absorberait sans broncher, mais qui reste une requête pour rien.
 */
export function useSyncStatus(): { status: SyncStatus; refresh: () => Promise<void> } {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';

  const status = useSyncExternalStore(subscribeToSync, getSyncStatus);

  /**
   * Rend une promesse depuis le #100 : le tirer-pour-rafraîchir doit savoir **quand** la
   * synchronisation a rendu son verdict, sous peine de retirer son témoin avant que rien
   * n'ait bougé. `sync` ne jette jamais — tout ce qui peut mal se passer ressort en
   * `SyncResult` — donc l'attendre n'oblige personne à attraper quoi que ce soit.
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (signedIn) {
      await sync('manual');
    }
  }, [signedIn]);

  return { status, refresh };
}
