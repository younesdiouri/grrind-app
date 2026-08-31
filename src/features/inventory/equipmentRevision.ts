/**
 * Combien de fois l'équipement a changé depuis le lancement de l'app.
 *
 * ————— Pourquoi le combattant du catalogue ne peut pas se rafraîchir tout seul ——————————
 *
 * `GET /api/enemies` rend le combattant de l'appelant **modificateurs équipés compris** (#227),
 * et l'onglet Combat le lit une seule fois, au chargement du catalogue. Équiper une paire de
 * bottes dans le sac, revenir sur Combat, et l'onglet montre le combattant d'avant : l'écran
 * ment précisément sur la seule chose que le joueur venait vérifier.
 *
 * Et il ne se démonte pas. Un onglet visité reste monté — c'est tout l'intérêt d'une barre
 * d'onglets — donc ni `useEffect` de montage ni paramètre de route ne le relira. C'est le même
 * trou que `battlesRevision` bouche pour l'historique au retour d'un combat, et il se bouche de
 * la même façon : un compteur, et les écrans qui s'y branchent.
 *
 * Ce défaut ne se voit pas en test manuel, parce qu'on ne revient jamais deux fois sur le même
 * écran dans la même session quand on vérifie une fonctionnalité qu'on vient d'écrire.
 *
 * Un nombre et non un booléen, pour la raison de `battlesRevision` : `useSyncExternalStore`
 * compare des instantanés, et deux équipements d'affilée doivent produire deux valeurs
 * distinctes.
 */
let revision = 0;
const listeners = new Set<() => void>();

export function subscribeToEquipment(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getEquipmentRevision(): number {
  return revision;
}

/**
 * Un objet vient d'être équipé ou retiré, **et le serveur l'a confirmé**.
 *
 * Appelée sur la réponse, jamais sur l'intention : un refus — objet non possédé, emplacement
 * incompatible — n'a rien changé au combattant, et faire relire le catalogue pour rien
 * afficherait un témoin de chargement là où il ne s'est rien passé.
 */
export function noteEquipmentChanged(): void {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
}
