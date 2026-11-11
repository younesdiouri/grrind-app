import type { components } from '@/api/schema';

export type WeekProgress = components['schemas']['WeekProgress'];
export type WeekEntry = components['schemas']['XpTransaction'];

export const WEEK_ATTRIBUTES = ['strength', 'endurance', 'mobility', 'dexterity'] as const;

/** Un zéro de référence n'a pas de pourcentage défini. */
export function weekPercent(current: number, previous: number | null): number | null {
  return previous === null || previous <= 0 ? null : Math.min(100, Math.round(Math.max(0, current) / previous * 100));
}

export function weekPercentLabel(current: number, previous: number | null): string {
  const percent = weekPercent(current, previous);
  return percent === null ? (previous === 0 && current > 0 ? 'Nouveau' : '—') : `${percent} %`;
}

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

/**
 * L'intensité du halo d'une jauge, entre 0 et 1 : éteint loin du but, puis de plus en plus
 * vite à l'approche — c'est la fin de la jauge qui doit chauffer, pas son début. Une jauge
 * chargée brille à plein.
 */
export function gaugeGlow(fill: number, charged: boolean): number {
  if (charged) return 1;
  const heat = (fill - gaugeHeat.from) / (1 - gaugeHeat.from);
  return heat <= 0 ? 0 : Math.min(1, heat * heat);
}

/** Sous ce remplissage, une jauge ne rayonne pas encore. */
const gaugeHeat = { from: 0.3 } as const;

/**
 * La jauge à prioriser : la plus proche de son but parmi celles qui ne sont pas chargées — le
 * gain le plus court à aller chercher. `null` s'il n'y a pas de référence ou plus rien à remplir.
 */
export function priorityOf(gauges: readonly { fill: number; beaten: boolean; remaining: number | null }[]): number | null {
  let best: number | null = null;
  gauges.forEach((gauge, index) => {
    if (gauge.remaining === null || gauge.beaten) return;
    if (best === null || gauge.fill > gauges[best].fill) best = index;
  });
  return best;
}
