import type { components } from '@/api/schema';

export type BattleSummary = components['schemas']['BattleSummary'];
export type BattlePage = components['schemas']['BattlePage'];

/**
 * L'historique accumulé, page après page.
 *
 * `nextCursor` est une **chaîne opaque** : le client la renvoie telle quelle et n'en lit
 * jamais le contenu. `null` veut dire la fin — il n'y a pas de total, un défilement infini
 * n'en a aucun usage.
 */
export type History = {
  battles: BattleSummary[];
  nextCursor: string | null;
};

export const EMPTY_HISTORY: History = { battles: [], nextCursor: null };

/**
 * Ajoute une page à la suite. Rien de plus, et c'est le point.
 *
 * ————— Pourquoi il n'y a pas de dédoublonnage ici ——————————————————————————————————————
 *
 * La tentation serait d'indexer par `id` avant de concaténer, « au cas où ». Ce serait
 * traiter un symptôme qui n'existe pas et masquer celui qui compte : le serveur reprend sur
 * `fought_at < :cursorAt OR (fought_at = :cursorAt AND id < :cursorId)`, et ce départage par
 * identifiant existe **précisément** pour que deux combats livrés à la même seconde ne se
 * doublent ni ne se sautent (younesdiouri/grrind-back#220). Un dédoublonnage client rendrait
 * une pagination cassée indiscernable d'une pagination correcte, et on ne le découvrirait
 * qu'au moment où un combat manquerait pour de bon.
 *
 * ————— La seule défense, et ce n'est pas de la méfiance ————————————————————————————————
 *
 * Une page **vide** ferme l'historique, quel que soit le curseur qu'elle porte. Le contrat
 * promet qu'un `nextCursor` ne rend jamais le vide, donc ce cas n'arrive pas — mais s'il
 * arrivait, la conséquence ne serait pas une liste incomplète, ce serait une **boucle de
 * requêtes sans fin** sur l'appareil d'un joueur. Une liste tronquée se voit et se corrige ;
 * une boucle vide une batterie en silence.
 */
export function appendPage(history: History, page: BattlePage): History {
  if (page.battles.length === 0) {
    return { battles: history.battles, nextCursor: null };
  }

  return {
    battles: [...history.battles, ...page.battles],
    nextCursor: page.nextCursor,
  };
}

/** Reste-t-il quelque chose à demander. */
export function hasMore(history: History): boolean {
  return history.nextCursor !== null;
}
