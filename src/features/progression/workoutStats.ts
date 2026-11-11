import type { components } from '@/api/schema';

type Workout = components['schemas']['Workout'];
export type StatsPeriod = 'week' | 'month' | 'year';
export const statsPeriodLabel: Record<StatsPeriod, string> = { week: 'Semaine', month: 'Mois', year: 'Année' };

function shiftDay(date: Date, count: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + count);
  return shifted;
}

export function statsWindow(period: StatsPeriod, now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  else if (period === 'month') start.setDate(1);
  else start.setMonth(0, 1);
  const end = new Date(start);
  const previousStart = new Date(start);
  if (period === 'week') { end.setDate(end.getDate() + 7); previousStart.setDate(previousStart.getDate() - 7); }
  else if (period === 'month') { end.setMonth(end.getMonth() + 1); previousStart.setMonth(previousStart.getMonth() - 1); }
  else { end.setFullYear(end.getFullYear() + 1); previousStart.setFullYear(previousStart.getFullYear() - 1); }
  const observedEnd = new Date(now);
  observedEnd.setHours(24, 0, 0, 0);
  const dates: Date[] = [];
  for (let date = new Date(start); date < observedEnd; date = shiftDay(date, 1)) dates.push(date);
  const comparisonEnd = shiftDay(previousStart, dates.length);
  const previousEnd = comparisonEnd > start ? start : comparisonEnd;
  return { start, end, observedEnd, previousStart, previousEnd, dates };
}

export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
export const shortDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
export function dateRange(from: Date, to: Date): string {
  const lastDay = shiftDay(to, -1);
  return dayKey(from) === dayKey(lastDay) ? shortDate(from) : `${shortDate(from)} – ${shortDate(lastDay)}`;
}
export const compactDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${String(minutes % 60).padStart(2, '0')}` : ''}`;
};

export function summarizeWorkouts(workouts: Workout[], period: StatsPeriod, now: Date) {
  const window = statsWindow(period, now);
  const { start, end, observedEnd, previousStart, previousEnd, dates } = window;
  const unique = [...new Map(workouts.map(workout => [workout.id, workout])).values()];
  const between = (from: Date, to: Date) => unique.filter(workout => {
    const at = new Date(workout.startedAt).getTime();
    return at >= from.getTime() && at < to.getTime();
  });
  const current = between(start, observedEnd);
  const previous = between(previousStart, previousEnd);
  const secondsOf = (items: Workout[]) => items.reduce((sum, item) => sum + item.durationSeconds, 0);
  const seconds = secondsOf(current);
  const previousSeconds = secondsOf(previous);
  const change = previousSeconds > 0 ? Math.round((seconds / previousSeconds - 1) * 100) : null;
  const ratio = previousSeconds > 0 ? seconds / previousSeconds : null;
  const grade: 'A' | 'B' | 'C' | 'D' | 'E' | null = ratio === null ? null : ratio >= 1.2 ? 'A' : ratio >= 1 ? 'B' : ratio >= .8 ? 'C' : ratio >= .5 ? 'D' : 'E';
  const daily = dates.map(date => {
    const items = current.filter(workout => dayKey(new Date(workout.startedAt)) === dayKey(date));
    return { date, seconds: secondsOf(items), sessions: items.length };
  });
  const buckets = [];
  for (let from = new Date(start); from < end;) {
    const to = new Date(from);
    if (period === 'year') to.setMonth(to.getMonth() + 1);
    else to.setDate(to.getDate() + 1);
    const items = between(from, to).filter(workout => new Date(workout.startedAt) < observedEnd);
    const axisLabel = period === 'week' ? from.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')
      : period === 'year' ? from.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '';
    buckets.push({ from, to, seconds: secondsOf(items), sessions: items.length,
      activeDays: new Set(items.map(workout => dayKey(new Date(workout.startedAt)))).size,
      isFuture: from >= observedEnd, axisLabel });
    from = to;
  }
  const disciplineMap = new Map<Workout['discipline'], { seconds: number; sessions: number }>();
  current.forEach(workout => {
    const entry = disciplineMap.get(workout.discipline) ?? { seconds: 0, sessions: 0 };
    disciplineMap.set(workout.discipline, { seconds: entry.seconds + workout.durationSeconds, sessions: entry.sessions + 1 });
  });
  const disciplines = [...disciplineMap].map(([discipline, totals]) => ({ discipline, ...totals, share: seconds > 0 ? totals.seconds / seconds : 0 }))
    .sort((a, b) => b.seconds - a.seconds);
  return { period, start, end, observedEnd, previousStart, previousEnd, current, previous, seconds, previousSeconds, change, grade, daily, buckets, disciplines,
    activeDays: daily.filter(day => day.sessions > 0).length, days: dates.length,
    averageSeconds: current.length > 0 ? seconds / current.length : 0,
  };
}

export type WorkoutStats = ReturnType<typeof summarizeWorkouts>;
