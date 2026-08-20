import { useEffect } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { takePendingPushRoute } from '@/features/notifications/pendingPushRoute';
import { routeTo } from '@/features/notifications/pushRouting';

/**
 * Consomme le tap qui attendait une session.
 *
 * Monté dans `(app)/_layout.tsx`, donc seulement une fois `signedIn` — c'est là, et pas plus
 * tôt, que `/joueur/{id}` existe sur la pile et que naviguer dessus a un sens. `signedIn` en
 * dépendance couvre aussi bien la fin d'une restauration que la connexion explicite d'un
 * compte : les deux sont le premier instant où une cible en attente peut s'ouvrir.
 *
 * `takePendingPushRoute` efface en lisant : cet effet ne route donc **jamais deux fois** la
 * même cible, y compris au double montage de développement.
 */
export function usePendingPushRoute(): void {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    const target = takePendingPushRoute();
    if (target !== null) {
      routeTo(target);
    }
  }, [signedIn]);
}
