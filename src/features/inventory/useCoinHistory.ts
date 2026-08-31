import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/api/client';
import { failureFrom, type Failure } from '@/features/auth/problems';
import { appendPage, EMPTY_HISTORY, hasMore, type History } from './coinHistory.ts';

/** Ce que le contrat borne à 50, et ce que le serveur prend par défaut. */
const PAGE_SIZE = 20;

/**
 * L'historique de la bourse, page après page — même modèle que `useBattleHistory`, dont le
 * docblock explique en détail les deux règles reprises ici :
 *
 * - l'accumulation vit dans une `useRef` (`accumulated`), pas dans l'état, parce
 *   qu'`onEndReached` d'une `FlatList` part plusieurs fois par geste de défilement et qu'un
 *   `setState(current => …)` s'y ferait rejouer par React (en `StrictMode`, systématiquement) ;
 * - une page déjà en vol se garde dans une `useRef` (`inFlight`) et non dans l'état, pour la
 *   même raison de synchronie immédiate.
 *
 * ————— Pourquoi il n'y a pas de compteur de révision ici —————————————————————————————————
 *
 * `useBattleHistory` se rebranche sur `battlesRevision` parce que l'onglet Combat ne se
 * démonte jamais et doit pourtant retrouver le combat qu'on vient de livrer au retour de
 * l'animation. `/bourse` est une route **poussée** depuis le sac : elle se monte à chaque
 * ouverture, donc elle relit déjà à chaque fois — rien à bâtir pour ce cas ici.
 *
 * `balance` n'accumule pas comme `transactions` : c'est un scalaire servi par le serveur à
 * chaque page, jamais recalculé depuis les mouvements lus. Le dernier reçu est le bon.
 */
export type CoinLedger =
  | { step: 'loading' }
  | { step: 'ready'; balance: number; history: History; loadingMore: boolean }
  | { step: 'failed'; failure: Failure };

export function useCoinHistory(): {
  ledger: CoinLedger;
  /** La page suivante, s'il en reste une et qu'aucune n'est déjà partie. */
  loadMore: () => void;
  reload: () => void;
} {
  const [ledger, setLedger] = useState<CoinLedger>({ step: 'loading' });

  /** Ce qui a été lu jusqu'ici, et le curseur de la suite. Seule source de la pagination. */
  const accumulated = useRef<History>(EMPTY_HISTORY);
  const inFlight = useRef(false);

  const fetchPage = useCallback(async (cursor: string | null) => {
    return api.GET('/api/inventory/coins', {
      params: { query: { limit: PAGE_SIZE, ...(cursor === null ? {} : { cursor }) } },
    });
  }, []);

  const loadFirstPage = useCallback(async (): Promise<CoinLedger> => {
    inFlight.current = true;
    accumulated.current = EMPTY_HISTORY;

    const page = await fetchPage(null);
    inFlight.current = false;

    if (page.data === undefined) {
      return { step: 'failed', failure: failureFrom(page.error) };
    }

    accumulated.current = appendPage(EMPTY_HISTORY, page.data);
    return { step: 'ready', balance: page.data.balance, history: accumulated.current, loadingMore: false };
  }, [fetchPage]);

  const reload = useCallback(() => {
    setLedger({ step: 'loading' });
    void loadFirstPage().then(setLedger);
  }, [loadFirstPage]);

  const loadMore = useCallback(() => {
    // Les trois refus, tous sur des références lues à l'instant : une page déjà en vol, une
    // première page qui n'a pas encore abouti, et la fin de l'historique.
    if (inFlight.current || !hasMore(accumulated.current)) {
      return;
    }

    inFlight.current = true;
    const cursor = accumulated.current.nextCursor;
    setLedger((current) => (current.step === 'ready' ? { ...current, loadingMore: true } : current));

    void fetchPage(cursor).then((page) => {
      inFlight.current = false;

      // Un refus au milieu d'un défilement ne vide pas la liste : les mouvements déjà lus
      // restent justes, et le geste se retente en défilant encore.
      if (page.data === undefined) {
        setLedger((current) =>
          current.step === 'ready' ? { ...current, loadingMore: false } : current,
        );
        return;
      }

      accumulated.current = appendPage(accumulated.current, page.data);
      setLedger({ step: 'ready', balance: page.data.balance, history: accumulated.current, loadingMore: false });
    });
  }, [fetchPage]);

  useEffect(() => {
    let alive = true;

    void loadFirstPage().then((next) => {
      if (alive) {
        setLedger(next);
      }
    });

    return () => {
      alive = false;
    };
  }, [loadFirstPage]);

  return { ledger, loadMore, reload };
}
