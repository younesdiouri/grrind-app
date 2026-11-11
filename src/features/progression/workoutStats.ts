import type { components } from '@/api/schema';

type Workout = components['schemas']['Workout'];
export type StatsDays = 7 | 28 | 84;

function shiftDay(date: Date, count: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + count);
  return shifted;
}

/** Des jours calendaires locaux, y compris les journées de 23 ou 25 h. */
export function statsWindow(days: StatsDays, now: Date) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const start = shiftDay(end, -days);
  return { start, end, previousStart: shiftDay(start, -days) };
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

export function summarizeWorkouts(workouts: Workout[], days: StatsDays, now: Date) {
  const { start, end, previousStart } = statsWindow(days, now);
  // L'ID protège les agrégats si une page chevauche la précédente pendant un import.
  const unique = [...new Map(workouts.map(workout => [workout.id, workout])).values()];
  const between = (from: Date, to: Date) => unique.filter(workout => {
    const at = new Date(workout.startedAt).getTime();
    return at >= from.getTime() && at < to.getTime();
  });
  const current = between(start, end);
  const previous = between(previousStart, start);
  const secondsOf = (items: Workout[]) => items.reduce((sum, item) => sum + item.durationSeconds, 0);
  const seconds = secondsOf(current);
  const previousSeconds = secondsOf(previous);
  const change = previousSeconds > 0 ? Math.round((seconds / previousSeconds - 1) * 100) : null;
  const ratio = previousSeconds > 0 ? seconds / previousSeconds : null;
  // Une lecture du volume observé, sans effet sur le jeu ni estimation d'intensité physique.
  const grade: 'A' | 'B' | 'C' | 'D' | 'E' | null = ratio === null ? null : ratio >= 1.2 ? 'A' : ratio >= 1 ? 'B' : ratio >= .8 ? 'C' : ratio >= .5 ? 'D' : 'E';
  const daily = Array.from({ length: days }, (_, index) => {
    const date = shiftDay(start, index);
    const items = current.filter(workout => dayKey(new Date(workout.startedAt)) === dayKey(date));
    return { date, seconds: secondsOf(items), sessions: items.length };
  });
  const bucketDays = days === 7 ? 1 : 7;
  const buckets = Array.from({ length: days / bucketDays }, (_, index) => {
    const from = shiftDay(start, index * bucketDays);
    const to = shiftDay(from, bucketDays);
    const oldFrom = shiftDay(previousStart, index * bucketDays);
    return { from, to, seconds: secondsOf(between(from, to)), previousSeconds: secondsOf(between(oldFrom, shiftDay(oldFrom, bucketDays))) };
  });
  const disciplineMap = new Map<Workout['discipline'], { seconds: number; sessions: number }>();
  current.forEach(workout => {
    const entry = disciplineMap.get(workout.discipline) ?? { seconds: 0, sessions: 0 };
    disciplineMap.set(workout.discipline, { seconds: entry.seconds + workout.durationSeconds, sessions: entry.sessions + 1 });
  });
  const disciplines = [...disciplineMap].map(([discipline, totals]) => ({ discipline, ...totals, share: seconds > 0 ? totals.seconds / seconds : 0 }))
    .sort((a, b) => b.seconds - a.seconds);
  return { current, previous, seconds, previousSeconds, change, grade, daily, buckets, disciplines,
    activeDays: daily.filter(day => day.sessions > 0).length,
    previousActiveDays: new Set(previous.map(workout => dayKey(new Date(workout.startedAt)))).size,
    averageSeconds: current.length > 0 ? seconds / current.length : 0,
  };
}

export type WorkoutStats = ReturnType<typeof summarizeWorkouts>;
