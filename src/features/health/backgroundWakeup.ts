/**
 * Le réveil des plateformes qui n'en ont pas encore.
 *
 * Même sélection par extension Metro que `current.ts`/`current.ios.ts` : ce fichier existe
 * pour qu'Android (#15) ait quelque chose à résoudre, pas pour prétendre qu'il a un réveil.
 * `enableBackgroundDelivery`, l'événement natif et `commitAnchor` sont une capacité propre à
 * iOS — voir le docblock de `GrrindHealthModule.swift` — donc il n'y a rien à activer ni à
 * écouter ici, et ce n'est pas une panne.
 */

export async function enableBackgroundWakeup(): Promise<void> {
  // `useSync.ts` appelle ceci à chaque lancement sans savoir sur quelle plateforme il tourne —
  // c'est le point de la sélection par extension. Ici, ça ne fait rien, et ça ne doit rien
  // faire : il n'y a pas de livraison en arrière-plan à activer.
}

export function startBackgroundWakeup(): () => void {
  return () => {
    // Rien à désinscrire.
  };
}
