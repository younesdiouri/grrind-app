import { router } from 'expo-router';
import { useEffect, useRef, useSyncExternalStore } from 'react';

import { hasInteracted } from '@/features/reward/launchGate';
import { getPending, subscribeToPending } from '@/features/reward/pending';

/**
 * Ouvre l'écran de récompense dès qu'une progression non jouée existe.
 *
 * Monté par la coquille de l'app, donc actif quel que soit l'écran affiché : une
 * synchronisation qui aboutit pendant que le joueur lit son historique doit se jouer, et il
 * n'a pas à être sur le bon écran pour ça.
 *
 * ————— Ce que ce hook ne fait pas ————————————————————————————————————————————————————
 *
 * **Il n'efface rien.** Marquer la progression comme jouée appartient à l'écran qui la joue,
 * et seulement quand le joueur en sort — une app tuée pendant l'animation n'a rien montré.
 *
 * **Il ne rejoue pas.** Le magasin notifie à chaque écriture, et une synchronisation de
 * retour au premier plan peut très bien réécrire le même résumé. Sans garde, l'animation
 * repartirait par-dessus elle-même.
 */
export function usePendingReward(): void {
  const pending = useSyncExternalStore(subscribeToPending, getPending);

  // Le résumé déjà envoyé à l'écran. Une `ref` et non un état : le changer ne doit rien
  // rendre, il ne sert qu'à ne pas naviguer deux fois vers la même chose.
  const shown = useRef<unknown>(null);

  useEffect(() => {
    if (pending === null || shown.current === pending) {
      return;
    }

    // Le joueur est en train de faire quelque chose. On ne l'interrompt pas : sa progression
    // reste non jouée et l'attendra au prochain lancement, où elle sera immédiate.
    if (hasInteracted()) {
      return;
    }

    shown.current = pending;
    router.push('/reward');
  }, [pending]);
}
