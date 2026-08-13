import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { getSyncStatus, subscribeToSync, sync, type SyncStatus } from '@/features/health/sync';

/**
 * Les trois déclencheurs de la synchronisation, et rien de plus.
 *
 * - **À l'ouverture de l'app**, une fois l'authentification établie. Pas avant : l'import est
 *   une route `Bearer`, et la déclencher sans jeton ferait partir un 401 qui brûlerait un
 *   rafraîchissement pour rien.
 * - **Au retour au premier plan** (`AppState` → `active`). Le seuil vit dans le coordinateur,
 *   pas ici : c'est une règle de synchronisation, pas une règle de React.
 * - **Manuellement**, par un geste de rafraîchissement. C'est le filet quand tout le reste a
 *   raté, donc il **ignore le seuil**.
 *
 * **Pas de tâche de fond en V1**, et ce n'est pas un manque de temps : iOS ne garantit aucun
 * réveil, et une synchronisation qu'on ne peut pas expliquer à l'utilisateur produit des
 * animations qui se déclenchent dans le vide — ou pire, une progression déjà jouée quand il
 * ouvre l'app.
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
      if (signedIn) {
        void sync(trigger);
      }
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

}

/**
 * Lire l'état, et le redemander.
 *
 * Séparé des déclencheurs **exprès** : ceux-ci vivent dans la coquille de l'app et n'y sont
 * montés qu'une fois, alors que plusieurs écrans veulent lire le résultat. Fondre les deux
 * ferait partir une synchronisation de plus à chaque écran qui s'ouvre — ce que le
 * coordinateur absorberait sans broncher, mais qui reste une requête pour rien.
 */
export function useSyncStatus(): { status: SyncStatus; refresh: () => void } {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';

  const status = useSyncExternalStore(subscribeToSync, getSyncStatus);

  const refresh = useCallback(() => {
    if (signedIn) {
      void sync('manual');
    }
  }, [signedIn]);

  return { status, refresh };
}
