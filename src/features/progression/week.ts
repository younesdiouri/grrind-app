import type { components } from '@/api/schema';

export type WeekProgress = components['schemas']['WeekProgress'];
export type WeekEntry = components['schemas']['XpTransaction'];

/**
 * Une jauge de la semaine (#362) : le gain contre celui de la semaine d'avant, la seule cible
 * qui existe. Sans référence servie, pas de cible inventée : `remaining` et `fill` restent
 * nuls et la jauge ne montre que le chiffre.
 */
export function gaugeOf(
  current: number,
  previous: number | null,
): { fill: number; beaten: boolean; remaining: number | null } {
  if (previous === null) return { fill: 0, beaten: false, remaining: null };
  if (previous <= 0) return { fill: current > 0 ? 1 : 0, beaten: current > 0, remaining: 0 };
  return {
    fill: Math.min(1, Math.max(0, current / previous)),
    beaten: current >= previous,
    remaining: Math.max(0, previous - current),
  };
}

/** « 2 j 5 h », « 3 h 12 », « 12 min » — jusqu'à la remise à zéro, jamais négatif. */
export function formatCountdown(until: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((new Date(until).getTime() - now.getTime()) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${String(minutes % 60).padStart(2, '0')}`;
  return `${minutes} min`;
}
