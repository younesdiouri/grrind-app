const paris = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
});
const HOUR = 3600000;

/** Planifie une relecture du cache, sans modifier les valeurs ni décider d’un reset. */
export function nextWeeklyRefreshAt(now: number): number {
  let next = Math.floor(now / HOUR) * HOUR + HOUR;
  for (;;) {
    const parts = paris.formatToParts(next);
    if (parts.some(part => part.type === 'weekday' && part.value === 'Sun')
      && parts.some(part => part.type === 'hour' && part.value === '20')) return next;
    next += HOUR;
  }
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
