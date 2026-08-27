import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

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

export function usePlayerHome(): {
  home: PlayerHome;
  /** Réessayer après un échec : l'écran repasse par son témoin, il n'y a rien à préserver. */
  reload: () => void;
  /**
   * Relire **sans vider l'écran** — ce que le tirer-pour-rafraîchir exige (#100).
   *
   * Rend une promesse pour que l'appelant sache quand les chiffres ont réellement bougé :
   * retirer le témoin à la fin de la synchronisation, avant que la lecture n'ait abouti,
   * donnerait l'impression que le geste n'a rien fait.
   */
  refresh: () => Promise<void>;
  /**
   * Le refus d'un rafraîchissement qui n'a pas vidé l'écran.
   *
   * Distinct de `home.step === 'failed'`, et c'est le point : là, il n'y a rien à afficher ;
   * ici, les chiffres d'avant sont toujours justes et valent mieux qu'un écran d'erreur. Il
   * se dit donc à côté d'eux, et s'efface au premier rafraîchissement qui aboutit.
   */
  refreshFailure: Failure | null;
} {
  const [home, setHome] = useState<PlayerHome>({ step: 'loading' });
  const [refreshFailure, setRefreshFailure] = useState<Failure | null>(null);

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

  /**
   * La lecture en cours, partagée — même idiome que `syncCoordinator.ts`, et pour la même
   * raison à plus petite échelle : un tirer-pour-rafraîchir déclenche une synchronisation, dont
   * le verdict fait *déjà* recharger cet écran par `settled`. Sans partage, le même couple de
   * requêtes partirait deux fois pour un seul geste.
   */
  const inFlight = useRef<Promise<PlayerHome> | null>(null);

  const loadOnce = useCallback((): Promise<PlayerHome> => {
    inFlight.current ??= load().finally(() => {
      inFlight.current = null;
    });

    return inFlight.current;
  }, [load]);

  useEffect(() => {
    let current = true;

    void loadOnce().then(
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
  }, [loadOnce, settled]);

  const reload = useCallback(() => {
    setHome({ step: 'loading' });
    setRefreshFailure(null);
    void load().then(setHome, (error: unknown) =>
      setHome({ step: 'failed', failure: failureFrom(error) }),
    );
  }, [load]);

  /**
   * Le tirer-pour-rafraîchir : **jamais** de passage par `loading`.
   *
   * `reload` démonte le contenu pour afficher son témoin, ce qui est juste après un échec — il
   * n'y a rien à préserver. Sous le doigt, ce serait l'écran qui disparaît au moment où on tire
   * dessus. Les chiffres restent donc en place jusqu'à ce que les nouveaux arrivent.
   */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await loadOnce();

      if (next.step === 'failed') {
        // Le contenu d'avant reste juste : on garde l'écran et on dit le refus à côté.
        setRefreshFailure(next.failure);
        return;
      }

      setHome(next);
      setRefreshFailure(null);
    } catch (error: unknown) {
      setRefreshFailure(failureFrom(error));
    }
  }, [loadOnce]);

  return { home, reload, refresh, refreshFailure };
}
