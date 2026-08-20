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
/**
 * Faut-il encore poser la question ? Ne dit **pas** ce que l'utilisateur a répondu — en lecture,
 * HealthKit ne le dit à personne.
 */
export type NativeAuthorizationPrompt = 'needed' | 'alreadyAsked' | 'unknown';

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

/**
 * « Il y a du neuf depuis l'ancre » — rien de plus.
 *
 * Ce n'est **pas** un lot de workouts : le natif a déjà vérifié, via `HKAnchoredObjectQuery`,
 * qu'il y a une différence à lire, mais il ne la transporte pas ici. Récupérer les workouts
 * eux-mêmes reste le travail de `workoutsSince`, sur le curseur du serveur — l'ancre répond à
 * une question distincte, « faut-il déranger le réseau ? », pas « qu'est-ce qui a changé ? ».
 *
 * `anchor` est l'ancre **neuve**, en base64, pas encore écrite sur le disque : c'est
 * `commitAnchor` qui l'y écrit, et seulement après qu'un appelant a de quoi la mériter (le
 * serveur a répondu). La faire avancer avant serait perdre une séance pour de bon au premier
 * import raté.
 */
export type NativeWorkoutsChangedEvent = {
  anchor: string;
};

type GrrindHealthEvents = {
  onWorkoutsChanged: (event: NativeWorkoutsChangedEvent) => void;
};

declare class GrrindHealthModule extends NativeModule<GrrindHealthEvents> {
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
   * Présenter la feuille système apporterait-il quelque chose ?
   *
   * Sépare « on n'a jamais demandé » de « on a déjà demandé », sans jamais dire ce qui a été
   * répondu. C'est la seule information que HealthKit consente à donner sur la lecture.
   */
  authorizationPrompt(): Promise<NativeAuthorizationPrompt>;

  /**
   * Les workouts **terminés** depuis cet instant, du plus ancien au plus récent.
   *
   * @param since millisecondes depuis l'époque Unix.
   */
  workoutsSince(since: number): Promise<NativeWorkout[]>;

  /**
   * Enregistre l'app auprès d'iOS pour être réveillée quand un workout change dans Santé, et
   * démarre l'observateur qui en profite (`HKObserverQuery`).
   *
   * Rappelable sans risque à chaque lancement — un observateur déjà en cours n'en démarre pas
   * un second. Rejette si l'entitlement `com.apple.developer.healthkit.background-delivery`
   * manque ou si HealthKit refuse l'inscription.
   *
   * **Ce que ceci ne fait pas** : ni appeler `sync`, ni parler au réseau. Le seul effet visible
   * côté JS est l'événement `onWorkoutsChanged`, quand HealthKit rend quelque chose.
   *
   * **Sur la fréquence réelle des réveils** : voir la documentation de la fonction native
   * (`GrrindHealthModule.swift`). `.immediate` est ce qui est demandé, pas ce qu'iOS garantit —
   * la documentation d'Apple ne plafonne pas explicitement les workouts, mais ne promet rien non
   * plus, et le réveil reste soumis au bon vouloir du système comme au moment où la montre se
   * synchronise avec le téléphone.
   */
  enableBackgroundDelivery(): Promise<void>;

  /**
   * Persiste l'ancre reçue par `onWorkoutsChanged`, dans le stockage sécurisé du module natif.
   *
   * **À n'appeler qu'après que le serveur a répondu** — succès ou échec définitif de l'import
   * qui a suivi l'événement. L'ancre ne progresse jamais d'elle-même à la lecture : c'est cet
   * appel, et lui seul, qui la fait avancer. Ne pas l'appeler après un échec fait relire la même
   * différence au prochain réveil, ce qui est le comportement voulu — rien à perdre à relire une
   * fois de plus, tout à perdre à avancer sur un import qui n'a pas abouti.
   */
  commitAnchor(anchor: string): Promise<void>;
}

export default requireNativeModule<GrrindHealthModule>('GrrindHealth');
