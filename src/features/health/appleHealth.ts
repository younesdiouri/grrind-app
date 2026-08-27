import GrrindHealth, {
  type NativeDailyActiveEnergy,
  type NativeWorkout,
} from '@/../modules/grrind-health/src/GrrindHealthModule';

import type { DailyActivityData, HealthProvider, WorkoutData } from '@/features/health/provider';

/**
 * Apple Santé, derrière le port.
 *
 * Ce fichier est **mince à dessein** : tout ce qui demande HealthKit vit dans le Swift, tout ce
 * qui demande une décision vit dans la synchronisation (#16). Il ne reste ici que la frontière —
 * une date en millisecondes, et la vérification que ce que le natif construit est bien ce que le
 * contrat attend.
 */

/**
 * Le rapprochement entre le natif et le contrat, à la compilation.
 *
 * `NativeWorkout` est déclaré dans le module, `WorkoutData` sort d'`openapi.yaml` : deux
 * définitions qui doivent coïncider et qu'aucun test d'exécution ne rapprocherait — un champ
 * renommé côté serveur ne se verrait qu'au premier import réel, en 422, sur l'appareil d'un
 * joueur.
 *
 * Cette fonction est l'affectation qui les confronte. Elle ne convertit rien, et c'est le point :
 * si elle compile, les deux formes sont compatibles ; le jour où elles divergent, le build casse
 * ici, avec le nom du champ fautif.
 */
function asWorkoutData(workout: NativeWorkout): WorkoutData {
  return workout;
}

/**
 * Le même rapprochement que ci-dessus, pour les journées d'énergie.
 *
 * `source` est ajoutée **ici** et non côté natif : le module n'a aucune raison de connaître
 * l'énumération du contrat, et c'est cette frontière-ci qui sait sur quelle plateforme elle
 * tourne. Le natif rend une mesure, ce fichier dit d'où elle vient.
 */
function asDailyActivityData(entry: NativeDailyActiveEnergy): DailyActivityData {
  return { ...entry, source: 'APPLE_HEALTH' };
}

export const appleHealthProvider: HealthProvider = {
  isAvailable: () => GrrindHealth.isAvailable(),

  requestAuthorization: () => GrrindHealth.requestAuthorization(),

  authorizationPrompt: () => GrrindHealth.authorizationPrompt(),

  /**
   * Le pont ne transporte pas de `Date` : la conversion en millisecondes se fait ici, une fois.
   * Passer une chaîne ISO obligerait les deux côtés à s'accorder sur un formateur, ce qui est
   * exactement le genre d'accord tacite qui se casse sur un fuseau.
   */
  workoutsSince: async (since) => {
    const workouts = await GrrindHealth.workoutsSince(since.getTime());
    return workouts.map(asWorkoutData);
  },

  dailyActiveEnergy: async (days) => {
    const entries = await GrrindHealth.dailyActiveEnergy(days);
    return entries.map(asDailyActivityData);
  },
};
