import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, type Failure } from '@/features/auth/problems';
import { getSettledRevision, subscribeToSync } from '@/features/health/sync';

export type Progression = components['schemas']['Progression'];
export type Workout = components['schemas']['Workout'];

/**
 * Ce que l'accueil affiche, en **une** requête chacun et un seul état.
 *
 * ————— Pourquoi les deux ensemble ————————————————————————————————————————————————————
 *
 * La progression et l'historique se chargent en parallèle mais **se posent d'un bloc**.
 * Deux états de chargement séparés donneraient un écran qui se remplit en deux temps :
 * le niveau apparaît, la liste arrive une seconde plus tard, et la page saute. Ce sont
 * deux routes parce que le serveur les sert séparément, pas parce que l'écran les vit
 * séparément.
 *
 * L'échec suit la même règle. Si l'une des deux tombe, l'écran n'a rien de cohérent à
 * montrer — un niveau sans historique n'explique pas d'où il vient — donc il n'en montre
 * aucun et propose de réessayer.
 *
 * ————— Pourquoi ça se recharge tout seul ——————————————————————————————————————————————
 *
 * Une synchronisation qui importe change **les deux**. Sans réabonnement, le joueur
 * reviendrait de son animation de récompense sur un accueil qui affiche encore le niveau
 * d'avant — le seul écran censé prouver que ça a compté serait le seul à l'ignorer.
 *
 * On se rebranche donc sur le magasin de synchronisation. Recharger sur **tout** verdict,
 * et pas seulement sur un import non vide, est délibéré : `ALREADY_IMPORTED` veut dire
 * qu'un autre appareil a crédité, et l'accueil doit le refléter aussi.
 *
 * ————— Ce qu'on ne fait pas ————————————————————————————————————————————————————————
 *
 * **Pas de pagination.** `nextCursor` est lu et ignoré : la première page prouve la chaîne,
 * et un défilement infini se conçoit avec le design (#7), pas avant lui.
 */
export type PlayerHome =
  | { step: 'loading' }
  | { step: 'ready'; progression: Progression; workouts: Workout[]; hasMore: boolean }
  | { step: 'failed'; failure: Failure };

export function usePlayerHome(): { home: PlayerHome; reload: () => void } {
  const [home, setHome] = useState<PlayerHome>({ step: 'loading' });

  // Le nombre de verdicts tombés, pas le statut : c'est le seul moment où les chiffres du
  // serveur ont pu bouger. S'abonner au statut rechargerait aussi au départ d'une
  // synchronisation, avant que rien n'ait changé.
  const settled = useSyncExternalStore(subscribeToSync, getSettledRevision);

  const load = useCallback(async (): Promise<PlayerHome> => {
    // En parallèle : elles ne dépendent pas l'une de l'autre, et les enchaîner doublerait
    // l'attente pour rien.
    const [progression, history] = await Promise.all([
      api.GET('/api/progression'),
      api.GET('/api/workouts', { params: { query: { limit: 20 } } }),
    ]);

    if (progression.data === undefined) {
      return { step: 'failed', failure: failureFrom(progression.error) };
    }

    if (history.data === undefined) {
      return { step: 'failed', failure: failureFrom(history.error) };
    }

    return {
      step: 'ready',
      progression: progression.data,
      workouts: history.data.workouts,
      hasMore: history.data.nextCursor !== null,
    };
  }, []);

  useEffect(() => {
    let current = true;

    void load().then(
      (next) => {
        if (current) {
          setHome(next);
        }
      },
      (error: unknown) => {
        if (current) {
          setHome({ step: 'failed', failure: failureFrom(error) });
        }
      },
    );

    return () => {
      current = false;
    };
    // `settled` change à chaque verdict de synchronisation, ce qui relance ce chargement.
  }, [load, settled]);

  const reload = useCallback(() => {
    setHome({ step: 'loading' });
    void load().then(setHome, (error: unknown) =>
      setHome({ step: 'failed', failure: failureFrom(error) }),
    );
  }, [load]);

  return { home, reload };
}
