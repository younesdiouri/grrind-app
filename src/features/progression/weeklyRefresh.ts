const paris = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', hour12: false,
});
const HOUR = 3600000;

/** Planifie une relecture du cache, sans modifier les valeurs ni décider d’un reset. */
export function nextWeeklyRefreshAt(now: number): number {
  const nextHour = Math.floor(now / HOUR) * HOUR + HOUR;
  for (let next = nextHour; next <= nextHour + 7 * 24 * HOUR; next += HOUR) {
    const parts = paris.formatToParts(next);
    if (parts.some(part => part.type === 'weekday' && part.value === 'Sun')
      && parts.some(part => part.type === 'hour' && part.value === '20')) return next;
  }
  // Un format natif inattendu provoque une relecture horaire, jamais une boucle bloquante.
  return nextHour;
}

let revision = 0;
const listeners = new Set<() => void>();
export function getProgressionRevision() { return revision; }
export function subscribeToProgression(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function noteProgressionStale() {
  revision += 1;
  for (const listener of listeners) listener();
}
