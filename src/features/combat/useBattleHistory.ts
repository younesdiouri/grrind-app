import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { api } from '@/api/client';
import { failureFrom, type Failure } from '@/features/auth/problems';
import { getBattlesRevision, subscribeToBattles } from './battlesRevision.ts';
import { appendPage, EMPTY_HISTORY, hasMore, type History } from './history.ts';

/** Ce que le contrat borne à 50, et ce que le serveur prend par défaut. */
const PAGE_SIZE = 20;

/**
 * L'historique des combats, page après page.
 *
 * ————— La première liste de l'app à réellement paginer ————————————————————————————————
 *
 * `usePlayerHome` lit `nextCursor` et l'ignore : la première page suffisait à prouver la
 * chaîne, et un défilement infini se concevait avec le design. Ici il ne s'ignore plus — le
 * back a construit cette pagination pour cet écran (younesdiouri/grrind-back#220), parce
 * qu'un joueur qui a livré trente combats n'a aucun autre moyen de revenir sur celui de la
 * semaine dernière.
 *
 * ————— L'accumulation vit dans une référence, l'état ne fait que l'afficher ——————————
 *
 * `onEndReached` d'une `FlatList` se déclenche **plusieurs fois** pendant un même geste de
 * défilement. Sans garde, deux pages partiraient avec le même curseur et l'historique
 * afficherait deux fois les mêmes vingt combats — un défaut qui ressemble à une pagination
 * cassée côté serveur alors qu'il est entièrement ici.
 *
 * La garde ne peut pas être un état : elle doit être vraie **immédiatement**, pas au rendu
 * suivant. Et elle ne peut pas non plus se décider dans un `setState(current => …)` : React
 * rejoue les fonctions de mise à jour — en `StrictMode`, systématiquement — donc y loger un
 * `fetch` en enverrait deux. L'accumulation est donc portée par `accumulated`, écrite à un
 * seul endroit, et l'état n'en est qu'un reflet qu'on rend.
 */
export type BattleHistory =
  | { step: 'loading' }
  | { step: 'ready'; history: History; loadingMore: boolean }
  | { step: 'failed'; failure: Failure };

export function useBattleHistory(): {
  history: BattleHistory;
  /** La page suivante, s'il en reste une et qu'aucune n'est déjà partie. */
  loadMore: () => void;
  reload: () => void;
} {
  const [history, setHistory] = useState<BattleHistory>({ step: 'loading' });

  /**
   * Combien de combats ont été livrés dans cette session.
   *
   * Un combat neuf doit apparaître **en tête** au retour de l'animation, et rien ne le ferait
   * autrement : l'écran a été démonté au moment du lancement. On se rebranche donc sur le
   * compteur, comme `usePlayerHome` se rebranche sur les verdicts de synchronisation.
   */
  const fought = useSyncExternalStore(subscribeToBattles, getBattlesRevision);

  /** Ce qui a été lu jusqu'ici, et le curseur de la suite. Seule source de la pagination. */
  const accumulated = useRef<History>(EMPTY_HISTORY);
  const inFlight = useRef(false);

  const fetchPage = useCallback(async (cursor: string | null) => {
    return api.GET('/api/battles', {
      params: { query: { limit: PAGE_SIZE, ...(cursor === null ? {} : { cursor }) } },
    });
  }, []);

  const loadFirstPage = useCallback(async (): Promise<BattleHistory> => {
    inFlight.current = true;
    accumulated.current = EMPTY_HISTORY;

    const page = await fetchPage(null);
    inFlight.current = false;

    if (page.data === undefined) {
      return { step: 'failed', failure: failureFrom(page.error) };
    }

    accumulated.current = appendPage(EMPTY_HISTORY, page.data);
    return { step: 'ready', history: accumulated.current, loadingMore: false };
  }, [fetchPage]);

  const reload = useCallback(() => {
    setHistory({ step: 'loading' });
    void loadFirstPage().then(setHistory);
  }, [loadFirstPage]);

  const loadMore = useCallback(() => {
    // Les trois refus, tous sur des références lues à l'instant : une page déjà en vol, une
    // première page qui n'a pas encore abouti, et la fin de l'historique.
    if (inFlight.current || !hasMore(accumulated.current)) {
      return;
    }

    inFlight.current = true;
    const cursor = accumulated.current.nextCursor;
    setHistory((current) => (current.step === 'ready' ? { ...current, loadingMore: true } : current));

    void fetchPage(cursor).then((page) => {
      inFlight.current = false;

      // Un refus au milieu d'un défilement ne vide pas la liste : les combats déjà lus restent
      // justes, et le geste se retente en défilant encore. C'est le même choix que le
      // `refreshFailure` de `usePlayerHome` — là il y a quelque chose à montrer, ici aussi.
      if (page.data === undefined) {
        setHistory((current) =>
          current.step === 'ready' ? { ...current, loadingMore: false } : current,
        );
        return;
      }

      accumulated.current = appendPage(accumulated.current, page.data);
      setHistory({ step: 'ready', history: accumulated.current, loadingMore: false });
    });
  }, [fetchPage]);

  useEffect(() => {
    let alive = true;

    void loadFirstPage().then((next) => {
      if (alive) {
        setHistory(next);
      }
    });

    return () => {
      alive = false;
    };
    // `fought` relance la lecture depuis la première page : le combat neuf est le plus récent,
    // donc il est en tête, donc reprendre au curseur ne le ramènerait jamais.
  }, [loadFirstPage, fought]);

  return { history, loadMore, reload };
}
