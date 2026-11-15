import type { WorkoutData } from '@/features/health/provider';

export const MAX_IMPORT_BATCH = 200;

/** Séparer uniquement des créneaux indépendants : le serveur choisit les gagnants. */
export function importBatches(found: readonly WorkoutData[]): WorkoutData[][] {
  const groups: WorkoutData[][] = [];
  let end = -Infinity;
  for (const workout of [...found].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))) {
    const start = Date.parse(workout.startedAt);
    const finish = Date.parse(workout.endedAt);
    if (!Number.isFinite(start) || !Number.isFinite(finish)) throw new Error('Dates de séance illisibles');
    if (groups.length === 0 || start >= end) {
      groups.push([]);
      end = finish;
    } else {
      end = Math.max(end, finish);
    }
    groups.at(-1)!.push(workout);
  }

  const batches: WorkoutData[][] = [];
  for (const group of groups) {
    const last = batches.at(-1);
    if (last && last.length + group.length <= MAX_IMPORT_BATCH) last.push(...group);
    else batches.push([...group]);
  }
  // Un groupe >200 reste entier sur disque ; aucun arbitrage métier n'est recopié ici.
  return batches;
}
