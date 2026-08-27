import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  notificationPermissionFrom,
  type NotificationPermission as SystemPermission,
} from '@/features/notifications/notificationPermission';

/**
 * L'autorisation système, telle quelle — ses **trois** états, pas deux.
 *
 * Contrairement à HealthKit (`useHealthAccess.ts`), `expo-notifications` ne cache rien : ses
 * trois valeurs disent exactement ce qui s'est passé, `undetermined` compris. Il n'y a rien à
 * *deviner* — mais ce n'est pas la même affirmation que « il n'y a que deux états », que ce
 * fichier a longtemps portée et qui était fausse.
 *
 * Le défaut coûtait un cul-de-sac (#81) : ne lire que le booléen `granted` repliait « jamais
 * demandé » sur « refusé », donc Réglages annonçait « les notifications sont désactivées » à un
 * joueur qu'on n'avait jamais interrogé, et le renvoyait vers un écran système **sans
 * interrupteur** — iOS n'affiche la section qu'une fois l'app passée par une première demande.
 * La table de lecture vit dans `notificationPermission.ts`, où elle se prouve seule.
 *
 * Se réévalue au retour au premier plan : c'est le seul moment où l'app peut apprendre qu'une
 * autorisation a changé dans Réglages système. `refresh` couvre l'autre cas, celui qui n'existait
 * pas avant : une demande faite **depuis l'app**, dont la feuille ne provoque pas toujours un
 * passage par `background` assez net pour que la ré-évaluation automatique suffise.
 */
export type NotificationPermission = 'checking' | SystemPermission;

export function useNotificationPermission(): {
  permission: NotificationPermission;
  refresh: () => void;
} {
  const [permission, setPermission] = useState<NotificationPermission>('checking');

  const check = useCallback(() => {
    void Notifications.getPermissionsAsync().then((response) => {
      setPermission(notificationPermissionFrom(response.status));
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

  return { permission, refresh: check };
}
