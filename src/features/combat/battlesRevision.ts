/**
 * Combien de combats ont été livrés depuis le lancement de l'app.
 *
 * ————— Pourquoi l'historique ne peut pas se recharger tout seul ————————————————————————
 *
 * L'écran de combat quitte la liste au moment où le verdict tombe : on part jouer l'animation,
 * et on revient — parfois beaucoup plus tard, parfois jamais si l'app meurt en route. Sans
 * signal, la liste retrouvée serait celle d'avant, sans le combat qu'on vient de livrer, ce qui
 * est exactement l'écran qui prouve que ça a compté.
 *
 * Le compteur est incrémenté **quand le verdict tombe**, pas à la sortie de l'animation : un
 * joueur qui tue l'app pendant la séquence doit retrouver son combat en tête de liste au
 * lancement suivant, et c'est le serveur qui le lui rendra — mais dans la même session, c'est
 * ce compteur qui l'a déjà fait relire.
 *
 * Un nombre et non un booléen : `useSyncExternalStore` compare des instantanés, et deux combats
 * livrés d'affilée doivent produire deux valeurs distinctes. C'est le même mécanisme que
 * `getSettledRevision` du côté santé, et pour la même raison.
 */
let revision = 0;
const listeners = new Set<() => void>();

export function subscribeToBattles(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBattlesRevision(): number {
  return revision;
}

/** Un combat vient d'être écrit côté serveur. */
export function noteBattleFought(): void {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
}
