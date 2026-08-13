import { NativeModule, requireNativeModule } from 'expo';

/**
 * La surface native, brute.
 *
 * Ce fichier ne fait que **déclarer** ce que le Swift expose ; il ne l'habille pas. L'habillage
 * — les dates en `Date` plutôt qu'en millisecondes, le port `HealthProvider`, le choix de
 * l'implémentation selon la plateforme — vit dans `src/features/health/`, où le reste de l'app
 * peut le tester sans appareil.
 *
 * Les millisecondes plutôt qu'une chaîne ISO pour `workoutsSince` : c'est le seul format de date
 * que les deux côtés du pont interprètent de la même façon sans se mettre d'accord sur un
 * formateur. La conversion se fait une fois, à la frontière.
 */

/**
 * Ce que le Swift construit, champ pour champ — la forme de `WorkoutRecord`.
 *
 * Elle est déclarée **ici** et pas importée de `@/api/schema` : ce module est autonome, il ne
 * connaît ni le client HTTP ni le contrat OpenAPI. C'est `src/features/health/appleHealth.ts`
 * qui rapproche les deux, par une affectation que le compilateur vérifie — si cette forme
 * s'écarte d'`ImportedWorkout`, le build casse là-bas, pas à l'exécution ici.
 */
export type NativeWorkout = {
  externalId: string;
  source: 'APPLE_HEALTH';
  activityType: string;
  startedAt: string;
  endedAt: string;
  distanceMeters: number | null;
  calories: number | null;
  elevationGainMeters: number | null;
  averageHeartRate: number | null;
};

declare class GrrindHealthModule extends NativeModule {
  /** HealthKit existe-t-il sur cet appareil ? Faux sur simulateur mal configuré et sur iPad. */
  isAvailable(): Promise<boolean>;

  /**
   * Ouvre la feuille système, et **ne dit pas ce que l'utilisateur a répondu**.
   *
   * Le `void` n'est pas une simplification : en lecture, HealthKit ne rend jamais le verdict
   * d'une autorisation. Un booléen ici serait une invention. Voir `src/features/health/` et
   * l'écran du #17, tous deux écrits pour cette ambiguïté.
   */
  requestAuthorization(): Promise<void>;

  /**
   * Les workouts **terminés** depuis cet instant, du plus ancien au plus récent.
   *
   * @param since millisecondes depuis l'époque Unix.
   */
  workoutsSince(since: number): Promise<NativeWorkout[]>;
}

export default requireNativeModule<GrrindHealthModule>('GrrindHealth');
