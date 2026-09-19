/** La date serveur est ancrée à la réception ; l'horloge locale ne mesure que le temps écoulé. */
export function presentationOffset(startsAt: string, serverNow: string, receivedAt: number, now: number, duration: number): number {
  return Math.max(0, Math.min(duration, Date.parse(serverNow) - Date.parse(startsAt) + Math.max(0, now - receivedAt)));
}

/** Échantillonne l'ordre livré, sans trier ni reconstruire un fait de jeu. */
export function eventIndexAt(events: readonly { offsetMs: number }[], time: number): number {
  'worklet';
  let index = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i].offsetMs > time) break;
    index = i;
  }
  return index;
}

/**
 * Une édition dont la fenêtre en direct est passée se relit depuis le début.
 *
 * La présentation dure une minute : passé ce délai l'écran s'ouvrait sur le résumé d'un combat
 * que personne n'avait vu jouer, ce qui est le cas de tout joueur qui rouvre son histoire.
 */
export function opensAsReplay(startsAt: string, serverNow: string, receivedAt: number, now: number, duration: number): boolean {
  return presentationOffset(startsAt, serverNow, receivedAt, now, duration) >= duration;
}
