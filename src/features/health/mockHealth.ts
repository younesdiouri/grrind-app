import { getE2eHealthScenario, type E2eHealthScenario } from '@/features/health/e2e';
import type {
  DailyActivityData,
  HealthProvider,
  WorkoutData,
} from '@/features/health/provider';

/**
 * Le fournisseur de santé du harnais E2E (#122).
 *
 * ————— Il implémente le port, il ne le contourne pas ——————————————————————————————————
 *
 * `HealthProvider` existait déjà, pour Android (#15). Ce fichier en est une troisième
 * implémentation, sélectionnée dans `current.ios.ts` par `isE2eBuild` et par rien d'autre :
 * le chemin de production reste `appleHealthProvider`, et aucun test ne le traverse.
 *
 * Il **n'écrit pas dans HealthKit**. Injecter des échantillons dans la base de santé du
 * simulateur ferait dépendre le test d'un état qui survit au flow, et d'une API d'écriture que
 * l'app ne demande pas.
 *
 * ————— Des dates relatives, et c'est ça qui les rend déterministes ————————————————————
 *
 * Les séances sont posées à *n* jours de `now`, pas à des dates absolues. Une date absolue
 * sortirait de la fenêtre d'import (`windowStart`) le lendemain de son écriture, et le test
 * cesserait de trouver quoi que ce soit sans que rien n'ait bougé.
 *
 * Ce qui est fixe, et qui suffit : l'heure de départ (07:00 UTC), les durées, les distances,
 * les calories, l'ordre. Deux exécutions à deux jours d'écart rendent les mêmes séances, avec
 * les mêmes mesures, donc la même XP. `createMockHealthProvider` prend `now` en paramètre
 * justement pour que `mockHealth.test.ts` le fige et vérifie les bornes à la seconde près.
 *
 * ————— Quatre séances pour prouver trois choses —————————————————————————————————————
 *
 * Trois disciplines différentes — course, vélo, musculation — dont une sans distance ni
 * dénivelé : le contrat les rend optionnels, et un jeu où tout est renseigné ne prouve rien.
 * Et une quatrième, vieille de quarante-cinq jours, qui tombe **hors** de la fenêtre d'import :
 * c'est elle qui montre que la fenêtre est appliquée, et pourquoi l'accueil affiche « 3
 * séances » et non quatre.
 */
const DAY_MS = 86_400_000;

type MockHealthOptions = {
  scenario: () => E2eHealthScenario;
  now: () => Date;
};

function workout(
  now: Date,
  input: Omit<WorkoutData, 'source' | 'startedAt' | 'endedAt'> & {
    daysAgo: number;
    durationMinutes: number;
  },
): WorkoutData {
  const startedAt = new Date(now.getTime() - input.daysAgo * DAY_MS);
  startedAt.setUTCHours(7, 0, 0, 0);
  const endedAt = new Date(startedAt.getTime() + input.durationMinutes * 60_000);

  return {
    externalId: input.externalId,
    source: 'APPLE_HEALTH',
    activityType: input.activityType,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    distanceMeters: input.distanceMeters,
    calories: input.calories,
    elevationGainMeters: input.elevationGainMeters,
    averageHeartRate: input.averageHeartRate,
  };
}

function multipleWorkouts(now: Date): WorkoutData[] {
  return [
    workout(now, {
      externalId: 'grrind-e2e-archived-run',
      activityType: 'running',
      daysAgo: 45,
      durationMinutes: 35,
      distanceMeters: 6200,
      calories: 410,
      elevationGainMeters: 32,
      averageHeartRate: 151,
    }),
    workout(now, {
      externalId: 'grrind-e2e-cycling',
      activityType: 'cycling',
      daysAgo: 3,
      durationMinutes: 52,
      distanceMeters: 18_400,
      calories: 530,
      elevationGainMeters: 210,
      averageHeartRate: 142,
    }),
    workout(now, {
      externalId: 'grrind-e2e-strength',
      activityType: 'traditionalStrengthTraining',
      daysAgo: 2,
      durationMinutes: 43,
      distanceMeters: null,
      calories: 360,
      elevationGainMeters: null,
      averageHeartRate: 128,
    }),
    workout(now, {
      externalId: 'grrind-e2e-run',
      activityType: 'running',
      daysAgo: 1,
      durationMinutes: 31,
      distanceMeters: 5800,
      calories: 390,
      elevationGainMeters: 44,
      averageHeartRate: 154,
    }),
  ];
}

export function createMockHealthProvider(options: MockHealthOptions): HealthProvider {
  return {
    isAvailable: async () => true,
    requestAuthorization: async () => undefined,
    authorizationPrompt: async () => 'alreadyAsked',
    workoutsSince: async (since) => {
      if (options.scenario() === 'empty') {
        return [];
      }

      return multipleWorkouts(options.now()).filter(
        (entry) => Date.parse(entry.endedAt) >= since.getTime(),
      );
    },
    dailyActiveEnergy: async (days) => {
      if (options.scenario() === 'empty') {
        return [];
      }

      const now = options.now();
      return Array.from({ length: days }, (_, index): DailyActivityData => {
        const date = new Date(now.getTime() - (days - index - 1) * DAY_MS);
        return {
          day: date.toISOString().slice(0, 10),
          activeEnergyKcal: 320 + index * 15,
          source: 'APPLE_HEALTH',
        };
      });
    },
  };
}

export const mockHealthProvider = createMockHealthProvider({
  scenario: getE2eHealthScenario,
  now: () => new Date(),
});
