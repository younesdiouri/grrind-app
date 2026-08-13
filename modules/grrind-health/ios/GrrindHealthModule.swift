import ExpoModulesCore
import HealthKit

/**
 Le pont vers HealthKit. **Aucune vue, aucune règle de jeu, aucune traduction.**

 Ce module lit ce qu'Apple Santé contient et le rend tel quel. Il ne décide pas ce qui vaut de
 l'XP, il ne convertit pas un `HKWorkoutActivityType` en discipline Grrind, et il ne filtre
 rien : la table de correspondance vit côté serveur (`config/game/v1/activity_types.yaml`), ce
 qui permet d'ouvrir un sport sans publier sur l'App Store. Un type que le serveur ne connaît
 pas revient nommé dans la réponse d'import, en `UNSUPPORTED_ACTIVITY` — il ne disparaît pas.

 Les trois fonctions correspondent une pour une au port `HealthProvider` côté TypeScript.
 */
public class GrrindHealthModule: Module {
  private let store = HKHealthStore()

  /**
   Ce qu'on demande à lire, et rien de plus.

   Le dénivelé n'est **pas** dans cette liste, et ce n'est pas un oubli : il arrive en métadonnée
   du workout (`HKMetadataKeyElevationAscended`), donc l'autorisation du type workout le couvre
   déjà. Demander un type de plus ajouterait une case à décocher dans la feuille système pour une
   donnée qu'on obtient sans elle.

   Les quatre distances sont demandées ensemble parce qu'une seule ne suffit pas : HealthKit range
   la distance d'un workout sous le type de sa famille — course et marche sous
   `distanceWalkingRunning`, vélo sous `distanceCycling`, natation sous `distanceSwimming`,
   fauteuil sous `distanceWheelchair`.
   */
  private let readTypes: Set<HKObjectType> = [
    HKObjectType.workoutType(),
    HKQuantityType(.activeEnergyBurned),
    HKQuantityType(.heartRate),
    HKQuantityType(.distanceWalkingRunning),
    HKQuantityType(.distanceCycling),
    HKQuantityType(.distanceSwimming),
    HKQuantityType(.distanceWheelchair)
  ]

  /**
   Les types de distance interrogés sur un workout, dans l'ordre.

   `statistics(for:)` ne rend que ce qui est **attaché à ce workout-là** : demander les quatre
   coûte quatre lectures d'un dictionnaire déjà en mémoire, pas quatre requêtes. C'est ce qui
   évite d'avoir à deviner la famille de discipline depuis l'`activityType` — deviner ici serait
   précisément la traduction que ce module n'a pas le droit de faire.
   */
  private let distanceTypes: [HKQuantityType] = [
    HKQuantityType(.distanceWalkingRunning),
    HKQuantityType(.distanceCycling),
    HKQuantityType(.distanceSwimming),
    HKQuantityType(.distanceWheelchair)
  ]

  public func definition() -> ModuleDefinition {
    Name("GrrindHealth")

    AsyncFunction("isAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    /**
     Ouvre la feuille système, et **ne dit pas ce que l'utilisateur a répondu**.

     C'est délibéré chez Apple : en lecture, `authorizationStatus(for:)` rend `notDetermined`
     que l'utilisateur ait accepté ou refusé, pour qu'une app ne puisse pas déduire qu'il a
     quelque chose à cacher. Cette fonction rend donc `void` : promettre un booléen ici serait
     promettre une information qui n'existe pas.

     Elle ne rejette que sur ce qui est réellement une panne — pas de HealthKit sur l'appareil,
     ou un refus du système. Voir grrind-app#17 pour l'écran qui vit avec cette ambiguïté.
     */
    AsyncFunction("requestAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject(HealthDataUnavailableException())
        return
      }

      self.store.requestAuthorization(toShare: [], read: self.readTypes) { _, error in
        if let error {
          promise.reject(HealthAuthorizationException(error.localizedDescription))
          return
        }
        promise.resolve()
      }
    }

    /**
     Les workouts terminés depuis `since`, du plus ancien au plus récent.

     `since` arrive en millisecondes depuis l'époque — la seule façon de faire traverser une date
     au pont JS sans dépendre d'un format de chaîne des deux côtés.

     Le filtre porte sur la **fin** du workout, pas sur son début : le curseur du serveur
     (`lastImportedAt`) est la fin du workout le plus récent qu'il connaisse. Filtrer sur le début
     laisserait passer entre les mailles une séance commencée avant le curseur et finie après.
     Ratisser large est sans conséquence — le serveur dédoublonne sur `externalId` — alors qu'une
     séance manquée ne revient jamais d'elle-même.
     */
    AsyncFunction("workoutsSince") { (since: Double, promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject(HealthDataUnavailableException())
        return
      }

      let start = Date(timeIntervalSince1970: since / 1000)
      let predicate = HKQuery.predicateForSamples(
        withStart: start,
        end: nil,
        options: .strictEndDate
      )

      let query = HKSampleQuery(
        sampleType: HKObjectType.workoutType(),
        predicate: predicate,
        limit: HKObjectQueryNoLimit,
        sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
      ) { _, samples, error in
        if let error {
          promise.reject(HealthQueryException(error.localizedDescription))
          return
        }

        let workouts = (samples as? [HKWorkout]) ?? []
        promise.resolve(workouts.map { self.describe($0).toDictionary() })
      }

      self.store.execute(query)
    }
  }

  // MARK: - Traduction d'un HKWorkout vers le contrat

  /**
   Un workout, réduit à ce que `ImportedWorkout` demande.

   Les mesures absentes valent `nil`, **jamais zéro** : « non mesuré » et « zéro » sont deux faits
   différents, et le serveur traite l'absence comme « pas de bonus » plutôt que comme une
   performance nulle. Un tour de piste plat a bien un dénivelé de zéro.
   */
  private func describe(_ workout: HKWorkout) -> WorkoutRecord {
    WorkoutRecord(
      externalId: workout.uuid.uuidString,
      source: "APPLE_HEALTH",
      activityType: Self.name(of: workout.workoutActivityType),
      startedAt: Self.iso8601.string(from: workout.startDate),
      endedAt: Self.iso8601.string(from: workout.endDate),
      distanceMeters: Self.whole(distance(of: workout)),
      calories: Self.whole(sum(of: workout, HKQuantityType(.activeEnergyBurned), .kilocalorie())),
      elevationGainMeters: Self.whole(elevation(of: workout)),
      averageHeartRate: Self.heartRate(averageHeartRate(of: workout))
    )
  }

  /**
   La distance du workout, quelle que soit sa famille.

   `totalDistance` ferait la même chose en une ligne, et c'est précisément le chemin que le
   ticket écarte : l'en-tête `HKWorkout.h` le marque `API_TO_BE_DEPRECATED` au profit de
   `statisticsForType:`, comme il a déjà retiré `totalEnergyBurned` en iOS 18.0. Les deux lisent
   les mêmes échantillons agrégés, mais `statistics(for:)` les relit au lieu de servir un champ
   figé à la construction du workout — un workout enrichi après coup par l'app qui l'a écrit
   rend une distance à jour d'un côté, périmée de l'autre.
   */
  private func distance(of workout: HKWorkout) -> Double? {
    for type in distanceTypes {
      if let meters = sum(of: workout, type, .meter()) {
        return meters
      }
    }
    return nil
  }

  private func sum(of workout: HKWorkout, _ type: HKQuantityType, _ unit: HKUnit) -> Double? {
    workout.statistics(for: type)?.sumQuantity()?.doubleValue(for: unit)
  }

  private func averageHeartRate(of workout: HKWorkout) -> Double? {
    let perMinute = HKUnit.count().unitDivided(by: .minute())
    return workout.statistics(for: HKQuantityType(.heartRate))?
      .averageQuantity()?
      .doubleValue(for: perMinute)
  }

  /**
   Le dénivelé positif, lu dans les métadonnées du workout.

   Il n'est pas une propriété de `HKWorkout` et il n'est pas non plus un type de quantité qu'on
   pourrait interroger : c'est une **métadonnée**, `HKMetadataKeyElevationAscended`, dont Apple
   documente la valeur comme un `HKQuantity` en unité de longueur. La montre la pose sur les
   randonnées, les sorties vélo et les courses en extérieur ; ailleurs elle est absente, et `nil`
   est alors la bonne réponse — le serveur lit l'absence comme « pas de bonus ».

   Aucune requête séparée n'est donc nécessaire, et aucune autorisation de plus : la métadonnée
   arrive avec le workout qu'on a déjà.
   */
  private func elevation(of workout: HKWorkout) -> Double? {
    guard let quantity = workout.metadata?[HKMetadataKeyElevationAscended] as? HKQuantity else {
      return nil
    }
    return quantity.doubleValue(for: .meter())
  }

  // MARK: - Mise au format du contrat

  private static let iso8601: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    return formatter
  }()

  /**
   Une mesure arrondie à l'entier, ou `nil`.

   Le contrat veut des entiers positifs, et **une seule valeur hors bornes fait rejeter le lot
   entier** en 422 : rendre `nil` sur l'aberrant coûte une mesure, la laisser passer coûte la
   synchronisation. Le `isFinite` n'est pas décoratif — une division par zéro en amont chez un
   fournisseur tiers produit un `NaN`, qui traverserait le pont JS sans bruit.
   */
  private static func whole(_ value: Double?) -> Int? {
    guard let value, value.isFinite, value >= 0 else {
      return nil
    }
    return Int(value.rounded())
  }

  /** La fréquence cardiaque, dans les bornes que le contrat déclare (1 à 300). */
  private static func heartRate(_ value: Double?) -> Int? {
    guard let beats = whole(value), beats >= 1, beats <= 300 else {
      return nil
    }
    return beats
  }

  /**
   Le nom de case Swift d'un `HKWorkoutActivityType`.

   **Ces chaînes sont le contrat.** Le serveur les compare telles quelles aux clés de sa table
   `apple_health` ; une casse qui diverge n'est pas une erreur bruyante, c'est un import
   silencieusement vide. Elles sont donc écrites ici à la main, une par une, en regard d'une case
   que le compilateur vérifie — plutôt que dérivées d'une réflexion sur l'enum, qu'Apple ne
   garantit pas.

   Le `switch` couvre bien plus que les vingt types que Grrind traduit aujourd'hui, et c'est le
   but : le client ne filtre pas. Le curling remonte sous son nom, le serveur l'écarte en
   `UNSUPPORTED_ACTIVITY`, et le joueur lit « le curling n'est pas encore un sport chez nous »
   au lieu de « 1 séance ignorée ».

   Le `default` rend une forme reconnaissable et stable plutôt qu'une chaîne vide : un type
   apparu dans un iOS plus récent que cette version de l'app se lit alors dans un rapport de bug.
   Les trois cases dépréciées par Apple (`dance`, `danceInspiredTraining`,
   `mixedMetabolicCardioTraining`) y tombent volontairement — aucune n'est traduite côté serveur,
   et les citer ne servirait qu'à faire hurler le compilateur à chaque build.
   */
  private static func name(of activity: HKWorkoutActivityType) -> String {
    switch activity {
    case .americanFootball: return "americanFootball"
    case .archery: return "archery"
    case .australianFootball: return "australianFootball"
    case .badminton: return "badminton"
    case .barre: return "barre"
    case .baseball: return "baseball"
    case .basketball: return "basketball"
    case .bowling: return "bowling"
    case .boxing: return "boxing"
    case .cardioDance: return "cardioDance"
    case .climbing: return "climbing"
    case .cooldown: return "cooldown"
    case .coreTraining: return "coreTraining"
    case .cricket: return "cricket"
    case .crossCountrySkiing: return "crossCountrySkiing"
    case .crossTraining: return "crossTraining"
    case .curling: return "curling"
    case .cycling: return "cycling"
    case .discSports: return "discSports"
    case .downhillSkiing: return "downhillSkiing"
    case .elliptical: return "elliptical"
    case .equestrianSports: return "equestrianSports"
    case .fencing: return "fencing"
    case .fishing: return "fishing"
    case .fitnessGaming: return "fitnessGaming"
    case .flexibility: return "flexibility"
    case .functionalStrengthTraining: return "functionalStrengthTraining"
    case .golf: return "golf"
    case .gymnastics: return "gymnastics"
    case .handCycling: return "handCycling"
    case .handball: return "handball"
    case .highIntensityIntervalTraining: return "highIntensityIntervalTraining"
    case .hiking: return "hiking"
    case .hockey: return "hockey"
    case .hunting: return "hunting"
    case .jumpRope: return "jumpRope"
    case .kickboxing: return "kickboxing"
    case .lacrosse: return "lacrosse"
    case .martialArts: return "martialArts"
    case .mindAndBody: return "mindAndBody"
    case .mixedCardio: return "mixedCardio"
    case .other: return "other"
    case .paddleSports: return "paddleSports"
    case .pickleball: return "pickleball"
    case .pilates: return "pilates"
    case .play: return "play"
    case .preparationAndRecovery: return "preparationAndRecovery"
    case .racquetball: return "racquetball"
    case .rowing: return "rowing"
    case .rugby: return "rugby"
    case .running: return "running"
    case .sailing: return "sailing"
    case .skatingSports: return "skatingSports"
    case .snowSports: return "snowSports"
    case .snowboarding: return "snowboarding"
    case .soccer: return "soccer"
    case .socialDance: return "socialDance"
    case .softball: return "softball"
    case .squash: return "squash"
    case .stairClimbing: return "stairClimbing"
    case .stairs: return "stairs"
    case .stepTraining: return "stepTraining"
    case .surfingSports: return "surfingSports"
    case .swimBikeRun: return "swimBikeRun"
    case .swimming: return "swimming"
    case .tableTennis: return "tableTennis"
    case .taiChi: return "taiChi"
    case .tennis: return "tennis"
    case .trackAndField: return "trackAndField"
    case .traditionalStrengthTraining: return "traditionalStrengthTraining"
    case .transition: return "transition"
    case .underwaterDiving: return "underwaterDiving"
    case .volleyball: return "volleyball"
    case .walking: return "walking"
    case .waterFitness: return "waterFitness"
    case .waterPolo: return "waterPolo"
    case .waterSports: return "waterSports"
    case .wheelchairRunPace: return "wheelchairRunPace"
    case .wheelchairWalkPace: return "wheelchairWalkPace"
    case .wrestling: return "wrestling"
    case .yoga: return "yoga"
    default: return "hkWorkoutActivityType\(activity.rawValue)"
    }
  }
}

/**
 Un workout tel qu'il traverse le pont — la forme exacte d'`ImportedWorkout` au contrat.

 Les champs facultatifs sont des `Int?` : Expo les sérialise en `null`, ce que le contrat déclare
 et ce que le serveur lit comme « non mesuré ».
 */
struct WorkoutRecord: Record {
  // Aucun `init()` explicite : en déclarer un supprimerait l'initialiseur mémberwise synthétisé,
  // dont `describe()` a besoin. Toutes les propriétés ayant une valeur par défaut, Swift
  // synthétise les deux — celui sans argument satisfait `Record`. Le `= nil` explicite sur les
  // mesures n'est pas décoratif : sans lui, l'init mémberwise attend un `Field<Int?>` au lieu
  // d'un `Int?`, et `describe()` ne compile plus.
  @Field var externalId: String = ""
  @Field var source: String = "APPLE_HEALTH"
  @Field var activityType: String = ""
  @Field var startedAt: String = ""
  @Field var endedAt: String = ""
  @Field var distanceMeters: Int? = nil
  @Field var calories: Int? = nil
  @Field var elevationGainMeters: Int? = nil
  @Field var averageHeartRate: Int? = nil
}

internal final class HealthDataUnavailableException: Exception, @unchecked Sendable {
  override var reason: String {
    "HealthKit n'est pas disponible sur cet appareil."
  }
}

internal final class HealthAuthorizationException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "La demande d'autorisation santé a échoué : \(param)"
  }
}

internal final class HealthQueryException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "La lecture des séances a échoué : \(param)"
  }
}
