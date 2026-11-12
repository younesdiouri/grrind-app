import type { components } from '@/api/schema';

export type WorkoutStats = components['schemas']['WorkoutStats'];
export type StatsPeriod = WorkoutStats['period'];
export const statsPeriodLabel: Record<StatsPeriod, string> = { week: 'Semaine', month: 'Mois', year: 'Année' };

export function statsDate(value: string | number, timezone: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString('fr-FR', { ...options, timeZone: timezone });
}

export const shortDate = (value: string | number, timezone: string) => statsDate(value, timezone, { day: 'numeric', month: 'short' });

export function dateRange(from: string, to: string, timezone: string): string {
  const first = shortDate(from, timezone);
  // La fin serveur est exclusive : le dernier instant appartient au dernier jour civil.
  const last = shortDate(Date.parse(to) - 1, timezone);
  return first === last ? first : `${first} – ${last}`;
}

export function statsAxisLabel(from: string, period: StatsPeriod, timezone: string): string {
  return period === 'month' ? '' : statsDate(from, timezone, period === 'week' ? { weekday: 'short' } : { month: 'short' }).replace('.', '');
}

export const compactDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${String(minutes % 60).padStart(2, '0')}` : ''}`;
};
