import type { components } from '@/api/schema';

/**
 * Le port de la santé — ce que la synchronisation a le droit de savoir de la plateforme.
 *
 * **Cette abstraction n'existe pas pour « découpler ».** Elle existe parce qu'Android arrive
 * (#15), et qu'une abstraction conçue à deux implémentations ne ressemble pas à une abstraction
 * rétro-adaptée à une. Les trois méthodes sont là où les deux plateformes divergent réellement,
 * et nulle part ailleurs :
 *
 * - `isAvailable()` — HealthKit manque sur iPad ; Health Connect est un composant système sur
 *   Android 14+ et une application à installer avant.
 * - `requestAuthorization()` — la feuille d'Apple ne se rejoue pas, les permissions de Google se
 *   révoquent en silence après trente jours. Les deux se redemandent, aucune ne rend de verdict
 *   exploitable.
 * - `workoutsSince()` — HealthKit attache ses statistiques au workout, Health Connect les agrège
 *   sur la fenêtre de la session. C'est **la** différence structurelle, et c'est celle que ce
 *   port cache.
 *
 * Ce qu'il ne cache pas, parce que ce serait mentir : que l'appareil rend `[]` sans qu'on sache
 * si l'utilisateur a refusé ou n'a simplement pas fait de sport. Voir `permission.ts`.
 */

/**
 * Un workout tel que le fournisseur l'a enregistré, prêt à partir dans un lot d'import.
 *
 * **C'est le type du contrat, pas un DTO maison.** `ImportedWorkout` sort de `openapi.yaml` :
 * ni les champs, ni les bornes, ni l'énumération de `source` ne se recopient ici. Le jour où le
 * back en ajoute un, il apparaît; le jour où il en resserre un, la compilation le dit.
 */
export type WorkoutData = components['schemas']['ImportedWorkout'];

/** `APPLE_HEALTH` ou `HEALTH_CONNECT`. Le serveur n'en connaît pas d'autre : ce sont les deux
 * agrégateurs de plateforme, pas les appareils. Une montre Garmin arrive en `APPLE_HEALTH` sur
 * iPhone et en `HEALTH_CONNECT` sur Android. */
export type WorkoutSource = WorkoutData['source'];

/**
 * Faut-il encore poser la question à l'utilisateur ?
 *
 * **Ce n'est pas son verdict**, et aucun fournisseur ne peut le donner : HealthKit ne dit
 * jamais si une autorisation de lecture a été refusée, et les permissions de Health Connect se
 * révoquent en silence après trente jours. Ce que ce port rend est la seule chose observable —
 * est-ce que redemander servirait à quelque chose ?
 */
export type AuthorizationPrompt =
  /** La demande n'a pas encore été posée. C'est le moment d'expliquer avant de la poser. */
  | 'needed'
  /** Elle l'a été. La reposer ne donnera pas de seconde chance : la seule porte est Réglages. */
  | 'alreadyAsked'
  /** Le système n'a pas su répondre. À traiter comme `needed` — demander deux fois ne coûte rien. */
  | 'unknown';

export interface HealthProvider {
  /**
   * Le fournisseur peut-il être interrogé sur cet appareil ?
   *
   * Ne dit **rien** des autorisations : un `true` sur un appareil dont l'utilisateur a tout
   * refusé reste un `true`. C'est une question de matériel et de système, pas de consentement —
   * et le consentement, en lecture, n'est de toute façon pas observable.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Demande l'accès en lecture, et ne rend pas de verdict.
   *
   * Le `void` est le contrat, pas une simplification. HealthKit rend `notDetermined` en lecture
   * que l'utilisateur ait accepté ou refusé — délibérément, pour qu'une app ne puisse pas
   * déduire qu'il a quelque chose à cacher. Promettre un booléen ici obligerait chaque
   * implémentation à en inventer un.
   *
   * Rejette quand la demande n'a pas pu être **posée** : pas de fournisseur sur l'appareil, ou
   * une panne du système. Un refus de l'utilisateur n'est pas une panne.
   */
  requestAuthorization(): Promise<void>;

  /**
   * Est-ce que redemander l'accès servirait à quelque chose ?
   *
   * La distinction que ça permet est **toute** la différence entre deux écrans : « voilà ce que
   * GRRIND va lire, et pourquoi » avant la feuille système, et « aucune activité trouvée » avec
   * le chemin vers Réglages après. Sans elle, il faudrait en choisir un et se tromper la moitié
   * du temps.
   */
  authorizationPrompt(): Promise<AuthorizationPrompt>;

  /**
   * Les workouts terminés depuis `since`, du plus ancien au plus récent.
   *
   * Un tableau vide est une réponse **normale et ambiguë** : aucune activité, ou un accès que
   * l'utilisateur n'a pas donné. Rien ici ne permet de les distinguer, et l'écran qui consomme
   * ça doit être écrit pour cette ambiguïté plutôt que d'en choisir une.
   */
  workoutsSince(since: Date): Promise<WorkoutData[]>;
}
