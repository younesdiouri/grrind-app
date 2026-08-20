import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * L'autorisation système, telle quelle.
 *
 * Contrairement à HealthKit (`useHealthAccess.ts`), `expo-notifications` ne cache rien : un
 * refus se lit sans ambiguïté sur `granted`. Pas de troisième état à deviner ici.
 *
 * Se réévalue au retour au premier plan : iOS ne repose jamais la question depuis l'app une
 * fois qu'elle a été refusée — le seul endroit où elle peut changer est Réglages système
 * (`Linking.openSettings`, dans `reglages.tsx`), et le seul moment où l'app peut le savoir est
 * le retour dessus.
 */
export type NotificationPermission = 'checking' | 'granted' | 'denied';

export function useNotificationPermission(): NotificationPermission {
  const [permission, setPermission] = useState<NotificationPermission>('checking');

  const check = useCallback(() => {
    void Notifications.getPermissionsAsync().then((status) => {
      setPermission(status.granted ? 'granted' : 'denied');
    });
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    const onChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        check();
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [check]);

  return permission;
}
