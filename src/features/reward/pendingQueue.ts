import type { SyncSummary } from '@/features/reward/timeline';

/**
 * La logique pure de la file des progressions non jouées.
 *
 * Séparée de `pending.ts`, qui écrit sur le disque : ce fichier ne connaît ni
 * `expo-file-system` ni aucune horloge, ce qui permet de prouver le comportement de la file —
 * l'ordre d'arrivée, l'absence de fusion, la migration d'un ancien format — sous `node --test`,
 * exactement comme `syncCoordinator.ts` prouve la sérialisation sans réseau.
 *
 * ————— Pourquoi une file, et pas une valeur ——————————————————————————————————————————
 *
 * Un seul déclencheur écrivait pendant qu'un joueur regardait l'écran : `setPending()`
 * écrasait sans conséquence. Avec le réveil HealthKit, deux ou trois réveils peuvent tomber
 * entre deux ouvertures de l'app, chacun avec son propre `SyncSummary`. Écraser le premier par
 * le second effacerait une progression pourtant créditée par le serveur — l'XP resterait
 * juste, la mise en scène disparaîtrait, précisément le dommage que ce module existe pour
 * empêcher.
 *
 * ————— Ce que la file ne fait jamais ————————————————————————————————————————————————
 *
 * **Aucune fusion.** On ne concatène pas deux `imported`, on n'additionne pas deux `totals`.
 * `totals` est ce que le serveur a décidé pour *ce* lot ; en fabriquer un troisième serait du
 * calcul de jeu côté client. La continuité de la barre entre deux résumés est déjà offerte par
 * le contrat — `xpIntoLevelBefore` du premier workout du lot suivant est l'arrivée du
 * précédent — donc elle tient sans qu'on y touche ici.
 */

/**
 * Un `SyncSummary` a-t-il la forme minimale que `buildTimeline` exige ?
 *
 * Le strict nécessaire, comme avant : ce fichier ne revalide pas tout le contrat, il ne
 * reconstruit que ce qui vient de nous-mêmes, jamais du réseau.
 */
function isSummaryShaped(value: unknown): value is SyncSummary {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as SyncSummary).imported) &&
    Array.isArray((value as SyncSummary).skipped)
  );
}

/**
 * Relit ce que le disque a rendu, sans lui faire confiance.
 *
 * Deux formes acceptées :
 *
 * - une file — le format courant, un tableau de `SyncSummary` dans l'ordre d'arrivée ;
 * - un `SyncSummary` seul — l'ancien format, celui d'avant cette file. L'envelopper au lieu de
 *   le jeter évite de perdre, à la première mise à jour de l'app, une progression déjà due au
 *   joueur.
 *
 * Toute autre forme — JSON tronqué, structure inconnue — rend une file vide : dans le doute,
 * une animation manquée est un incident mineur, pas une raison de faire planter l'écran qui la
 * lit.
 */
export function parsePendingQueue(parsed: unknown): SyncSummary[] {
  if (isSummaryShaped(parsed)) {
    return [parsed];
  }

  if (Array.isArray(parsed) && parsed.every(isSummaryShaped)) {
    return parsed;
  }

  return [];
}

/** Ajoute un résumé en fin de file — voir le docblock plus haut : jamais de fusion. */
export function enqueuePending(
  queue: readonly SyncSummary[],
  summary: SyncSummary,
): SyncSummary[] {
  return [...queue, summary];
}

/**
 * Le résumé en tête a été joué : c'est le seul qui parte, et seulement lui.
 *
 * Une file vide se rend telle quelle plutôt que de jeter — un double appel (l'écran de
 * récompense qui se démonte deux fois, par exemple) ne doit rien casser.
 */
export function dequeuePending(queue: readonly SyncSummary[]): SyncSummary[] {
  return queue.length === 0 ? [] : queue.slice(1);
}
