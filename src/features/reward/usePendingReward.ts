import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { hasInteracted, mayOpenReward } from '@/features/reward/launchGate';
import { getPending, subscribeToPending, wasSolicited } from '@/features/reward/pending';

/**
 * Ouvre l'écran de récompense dès qu'une progression non jouée existe.
 *
 * Monté par la coquille de l'app, donc actif quel que soit l'écran affiché : une
 * synchronisation qui aboutit pendant que le joueur lit son historique doit se jouer, et il
 * n'a pas à être sur le bon écran pour ça.
 *
 * ————— Il ne navigue que devant quelqu'un ————————————————————————————————————————————
 *
 * Un réveil HealthKit ne réveille pas un composant, il relance le **processus** : iOS remonte
 * toute la coquille, cette coquille comprise, dans une app que personne ne regarde.
 * `hasInteracted()` ne protège pas ce cas — il est faux sur un processus neuf, c'est
 * précisément la situation d'un lancement — donc sans autre garde, une progression déjà en
 * file au réveil ferait partir `router.push('/reward')` dans le vide. Ce qui se passe ensuite
 * dépend de si l'horloge de l'animation tourne pendant qu'une app en arrière-plan n'affiche
 * rien, et c'est justement pour ça qu'il ne faut pas en dépendre : dans le pire cas, le joueur
 * ouvre son app et trouve son animation déjà terminée — le dommage exact que `pending.ts`
 * existe pour empêcher.
 *
 * D'où la garde sur `AppState.currentState` : ce hook ne décide de ce que le joueur voit que
 * quand il y a un joueur devant l'écran. **Elle, elle ne cède jamais** — pas même à une
 * progression sollicitée : personne devant l'écran veut dire personne, quel qu'ait été le
 * geste qui a lancé la synchronisation. Comme la progression en attente ne bouge pas pendant
 * qu'elle reste hors ligne, il suffit de réévaluer au passage à `active` — pas besoin de
 * relire le magasin, `pending` est déjà à jour.
 *
 * ————— Ce que ce hook ne fait pas ————————————————————————————————————————————————————
 *
 * **Il n'efface rien.** Marquer la progression comme jouée appartient à l'écran qui la joue,
 * et seulement quand le joueur en sort — une app tuée pendant l'animation n'a rien montré.
 *
 * **Il ne rejoue pas.** Le magasin notifie à chaque écriture, y compris quand un réveil
 * HealthKit met une progression de plus en file (`pending.ts`) pendant que le joueur regarde
 * autre chose. La référence en tête ne bouge que quand la précédente est jouée et retirée
 * (`markPlayed`) : sans la garde `shown`, une file qui grossit pendant que l'écran est déjà
 * ouvert renaviguerait sur lui-même pour rien.
 */
export function usePendingReward(): void {
  const pending = useSyncExternalStore(subscribeToPending, getPending);

  // Le résumé déjà envoyé à l'écran. Une `ref` et non un état : le changer ne doit rien
  // rendre, il ne sert qu'à ne pas naviguer deux fois vers la même chose.
  const shown = useRef<unknown>(null);

  const tryShow = useCallback(() => {
    if (pending === null || shown.current === pending) {
      return;
    }

    // Les deux gardes, et elles ne se valent pas — la règle vit dans `mayOpenReward`, où elle
    // se prouve sans monter de composant. Ce hook ne fait que lui apporter les trois faits.
    const allowed = mayOpenReward({
      // Personne ne regarde : un réveil qui vient de relancer le processus, ou une app qui
      // finit de s'installer en arrière-plan. Celle-là ne cède jamais.
      active: AppState.currentState === 'active',
      interacted: hasInteracted(),
      // Celle-ci, si : le joueur vient de taper « Synchroniser maintenant » ou de tirer pour
      // rafraîchir (#97).
      solicited: wasSolicited(pending),
    });

    // La progression reste non jouée et sera retentée au prochain passage à `active`, ou au
    // prochain lancement — où elle sera immédiate.
    if (!allowed) {
      return;
    }

    shown.current = pending;
    router.push('/reward');
  }, [pending]);

  useEffect(() => {
    tryShow();
  }, [tryShow]);

  // Le passage au premier plan est le seul moment où « personne ne regarde » peut devenir
  // faux sans que `pending` ait lui-même changé — même idiome que le déclencheur `foreground`
  // de `useSync.ts`.
  useEffect(() => {
    const onChange = (next: AppStateStatus): void => {
      if (next === 'active') {
        tryShow();
      }
    };

    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, [tryShow]);
}
