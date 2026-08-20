import { useEffect } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import { reregisterIfAuthorized } from '@/features/notifications/registration';

/**
 * Le jeton de push, réenregistré à chaque démarrage — jamais demandé ici.
 *
 * Monté par la coquille de l'app (`(app)/_layout.tsx`), exactement comme `useSyncTriggers`
 * (`src/features/health/useSync.ts`), et pour la même raison : `POST /api/devices` est une
 * route `Bearer`, la déclencher avant que la session soit établie brûlerait un rafraîchissement
 * pour rien. `signedIn` en dépendance fait aussi office de déclencheur après une connexion —
 * un compte qui vient de se connecter réenregistre sans qu'on ait à l'appeler une seconde fois.
 *
 * `reregisterIfAuthorized` ne pose jamais la question : elle relit l'autorisation déjà posée et
 * s'arrête net si elle ne l'a pas. Le jeton change parfois sans qu'aucune autorisation n'ait
 * bougé — restauration de sauvegarde, réinstallation — et le serveur ne l'apprend jamais
 * autrement qu'en le recevant ; c'est pour ça que ce hook rejoue à **chaque** démarrage, et pas
 * seulement à la première autorisation.
 */
export function useDeviceRegistration(): void {
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';

  useEffect(() => {
    if (signedIn) {
      void reregisterIfAuthorized();
    }
  }, [signedIn]);
}
