import type { components } from '@/api/schema';

export type CoinTransaction = components['schemas']['CoinTransaction'];
export type CoinHistoryPage = components['schemas']['CoinHistoryPage'];

/**
 * L'historique du ledger de pièces, accumulé page après page.
 *
 * Même forme que `combat/history.ts` — **le** précédent de la pagination au curseur dans ce
 * dépôt — mais écrite ici plutôt que réutilisée : celui-là parle de combats, celui-ci d'un
 * ledger de pièces (younesdiouri/grrind-back#225), et rien ne les rapproche au-delà du geste.
 *
 * `nextCursor` est une **chaîne opaque** : le client la renvoie telle quelle et n'en lit jamais
 * le contenu. `null` veut dire la fin — il n'y a pas de total, un défilement infini n'en a
 * aucun usage.
 */
export type History = {
  transactions: CoinTransaction[];
  nextCursor: string | null;
};

export const EMPTY_HISTORY: History = { transactions: [], nextCursor: null };

/**
 * Ajoute une page à la suite. Rien de plus, et c'est le point.
 *
 * ————— Pourquoi il n'y a ni tri ni dédoublonnage ici ——————————————————————————————————
 *
 * Le serveur trie sur `occurredAt` — la date du **fait**, pas celle de l'écriture — puis sur
 * l'identifiant pour départager : deux mouvements au même instant sont un cas normal, et ce
 * départage existe précisément pour que ni l'un ni l'autre ne se double ou ne se saute
 * (younesdiouri/grrind-back#225, qui a dû corriger son propre tri après coup dans ce sens).
 * Retrier ou dédoublonner ici rendrait une pagination cassée indiscernable d'une pagination
 * correcte, et on ne le découvrirait qu'au moment où un mouvement manquerait pour de bon —
 * même piège, même défense que `combat/history.ts`.
 *
 * ————— La seule garde ——————————————————————————————————————————————————————————————————
 *
 * Une page **vide** ferme l'historique, quel que soit le curseur qu'elle porte. Le contrat
 * promet qu'un `nextCursor` ne rend jamais le vide, donc ce cas n'arrive pas — mais s'il
 * arrivait, la conséquence ne serait pas une liste incomplète, ce serait une **boucle de
 * requêtes sans fin** sur l'appareil d'un joueur. Une liste tronquée se voit et se corrige ;
 * une boucle vide une batterie en silence.
 */
export function appendPage(history: History, page: CoinHistoryPage): History {
  if (page.transactions.length === 0) {
    return { transactions: history.transactions, nextCursor: null };
  }

  return {
    transactions: [...history.transactions, ...page.transactions],
    nextCursor: page.nextCursor,
  };
}

/** Reste-t-il quelque chose à demander. */
export function hasMore(history: History): boolean {
  return history.nextCursor !== null;
}
