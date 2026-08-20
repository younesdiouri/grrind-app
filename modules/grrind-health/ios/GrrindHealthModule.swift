import ExpoModulesCore
import HealthKit
import Security

/**
 Le pont vers HealthKit. **Aucune vue, aucune règle de jeu, aucune traduction.**

 Ce module lit ce qu'Apple Santé contient et le rend tel quel. Il ne décide pas ce qui vaut de
 l'XP, il ne convertit pas un `HKWorkoutActivityType` en discipline Grrind, et il ne filtre
 rien : la table de correspondance vit côté serveur (`config/game/v1/activity_types.yaml`), ce
 qui permet d'ouvrir un sport sans publier sur l'App Store. Un type que le serveur ne connaît
 pas revient nommé dans la réponse d'import, en `UNSUPPORTED_ACTIVITY` — il ne disparaît pas.

 Les trois premières fonctions correspondent une pour une au port `HealthProvider` côté
 TypeScript. Les suivantes — `enableBackgroundDelivery`, l'événement `onWorkoutsChanged` et
 `commitAnchor` — n'y apparaissent pas et **n'y apparaîtront pas** : c'est une capacité propre à
 iOS, câblée depuis `modules/grrind-health/src/GrrindHealthModule.ts` directement plutôt que par
 le port. Android n'a pas encore d'équivalent (#15), et ce n'est pas ce ticket qui l'invente.

 ————— Ce que le natif fait seul, sans jamais attendre le JS ——————————————————————————————

 `HKObserverQuery` réveille l'app quand HealthKit a du neuf ; `HKAnchoredObjectQuery` dit s'il
 s'agit vraiment de quelque chose de nouveau **depuis l'ancre**, une mémoire distincte du
 curseur serveur (`lastImportedAt`, côté `syncState.ts`). Le natif lit cette différence lui-même
 avant de déranger qui que ce soit : rien à lire depuis l'ancre, `completionHandler` est appelé
 et rien ne part vers JS. Quelque chose à lire, l'événement part avec la **nouvelle** ancre — pas
 encore écrite sur le disque, seulement rendue — et `completionHandler` est rappelé par un délai
 armé ici, pas par un acquittement du JS qui pourrait ne jamais venir (bundle pas chargé,
 exception dans un `await`, runtime tué en plein réveil). C'est `commitAnchor` qui écrit
 l'ancre, plus tard, et seulement si l'appelant a de quoi la mériter — voir sa documentation.

 `HKObserverQuery` **redémarre à chaque lancement du processus** — `startObserving()` est câblé
 sur `OnCreate`, avant le premier rendu React, plutôt que sur un appel JS qui arriverait trop
 tard pour le réveil qui vient de lancer l'app. L'enregistrement système
 (`enableBackgroundDelivery`), lui, ne se refait pas à chaque lancement : une fois accepté par
 iOS, il survit aux redémarrages du processus et ne se rappelle qu'à la demande — typiquement
 après une autorisation nouvellement accordée.
 */
public class GrrindHealthModule: Module {
  private let store = HKHealthStore()

  /** L'observateur en cours d'exécution, retenu pour ne pas être désalloué entre deux réveils.
   Un second appel à `enableBackgroundDelivery` ne doit pas en démarrer un deuxième par-dessus :
   HealthKit livrerait alors chaque changement deux fois. */
  private var observerQuery: HKObserverQuery?

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

    // Un seul événement : « il y a du neuf depuis l'ancre ». Il ne porte jamais de workout —
    // ça reste le travail de `workoutsSince`, sur le curseur serveur — seulement l'ancre neuve
    // que HealthKit vient de rendre, pour que l'appelant puisse la commettre plus tard.
    Events("onWorkoutsChanged")

    // L'observateur ne doit pas dépendre d'un appel JS pour exister : au réveil, iOS relance le
    // processus et exécute ce bloc avant le premier rendu React, donc avant que le #55 ait pu
    // câbler quoi que ce soit. Le gater sur `enableBackgroundDelivery()` déplacerait le trou que
    // `OnStartObserving` aurait creusé — la requête d'observation doit déjà être en place quand
    // le réveil arrive, pas s'installer en réaction à lui. `startObserving()` est idempotent et
    // ne tente rien de coûteux sans autorisation : sans elle, il ne livre simplement jamais rien.
    OnCreate {
      self.startObserving()
    }

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
     Faut-il encore poser la question ?

     **Ce n'est pas le verdict de l'utilisateur, et rien ne peut l'être.** Les trois valeurs de
     `HKAuthorizationStatus` sont toutes formulées en termes d'*écriture* — « may save objects »,
     « not allowed to save », « is authorized to save » — et l'en-tête `HKDefines.h` n'en propose
     aucune pour la lecture. C'est délibéré chez Apple : une app ne doit pas pouvoir déduire
     qu'un utilisateur a quelque chose à cacher.

     `getRequestStatusForAuthorizationToShareTypes:readTypes:` dit autre chose, et c'est
     exactement ce dont l'écran a besoin : est-ce que présenter la feuille système apporterait
     quoi que ce soit ? Elle sépare « on n'a jamais demandé » de « on a déjà demandé », **sans
     jamais dire ce qui a été répondu**.

     - `needed` — la feuille montrera quelque chose. C'est le moment d'expliquer avant.
     - `alreadyAsked` — la question a été posée. La rejouer ne donnerait pas de seconde chance
       à l'utilisateur qui a décoché par réflexe : la feuille d'Apple ne se rejoue pas, et la
       seule porte restante est Réglages.
     - `unknown` — une panne du système. On traite comme `needed` : demander deux fois est sans
       conséquence, ne jamais demander en a une.
     */
    AsyncFunction("authorizationPrompt") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject(HealthDataUnavailableException())
        return
      }

      self.store.getRequestStatusForAuthorization(toShare: [], read: self.readTypes) { status, error in
        if error != nil {
          promise.resolve("unknown")
          return
        }

        switch status {
        case .shouldRequest: promise.resolve("needed")
        case .unnecessary: promise.resolve("alreadyAsked")
        default: promise.resolve("unknown")
        }
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

    /**
     Demande à iOS de réveiller l'app quand un workout change dans Santé, et démarre
     l'observateur qui en profite.

     Deux étapes distinctes chez Apple, l'une n'entraînant pas l'autre : `enableBackgroundDelivery`
     enregistre l'app auprès du système, `HKObserverQuery` est ce qui reçoit effectivement le
     réveil. Sans la première, la seconde ne tourne qu'au premier plan ; sans la seconde, la
     première ne réveillerait personne.

     Idempotent par construction : rappelable sans risque à chaque lancement (l'entitlement
     `com.apple.developer.healthkit.background-delivery` doit être présent, sans lui cet appel
     échoue avec `errorAuthorizationDenied`), `startObserving()` ne crée un second observateur
     que si aucun ne tourne déjà.

     **Sur la fréquence : ce que dit Apple, sans l'arrondir.** `.immediate` ne veut pas dire
     instantané — la documentation d'`enableBackgroundDelivery(for:frequency:withCompletion:)`
     est explicite : *"The system wakes your app at most once per time period defined by the
     specified frequency"*, et certains types ont un plafond imposé — `stepCount` est cité à
     `hourly` au maximum, appliqué silencieusement par le système. Rien dans cette même page ne
     mentionne un plafond particulier pour `HKWorkoutType` : `.immediate` est donc ce qu'on
     demande, mais ni cette fonction ni sa documentation ne garantissent qu'iOS l'honore à la
     lettre. Seul un iPhone physique le dira.
     */
    AsyncFunction("enableBackgroundDelivery") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.reject(HealthDataUnavailableException())
        return
      }

      self.store.enableBackgroundDelivery(for: HKObjectType.workoutType(), frequency: .immediate) { success, error in
        if let error {
          promise.reject(HealthBackgroundDeliveryException(error.localizedDescription))
          return
        }

        guard success else {
          promise.reject(HealthBackgroundDeliveryException(
            "HealthKit a refusé la livraison en arrière-plan sans donner d'erreur."
          ))
          return
        }

        self.startObserving()
        promise.resolve()
      }
    }

    /**
     Écrit l'ancre sur le disque — **et seulement ça**. Elle n'avance jamais d'elle-même à la
     lecture : c'est cet appel, et lui seul, qui la fait progresser, pour que l'appelant ne le
     fasse qu'après avoir de quoi la mériter (le serveur a répondu). Avancer l'ancre à la lecture
     ferait perdre une séance pour de bon au premier import raté — l'ancre n'ayant plus rien à
     rejouer, la séance qu'elle couvrait ne reviendrait jamais.

     Rejette plutôt que d'écrire n'importe quoi : une ancre qui ne se décode pas n'est d'aucune
     confiance, qu'elle vienne d'un bug ou d'une version antérieure du module.
     */
    AsyncFunction("commitAnchor") { (anchor: String, promise: Promise) in
      guard let data = Data(base64Encoded: anchor), Self.decodeAnchor(data) != nil else {
        promise.reject(HealthAnchorException("L'ancre reçue n'est pas lisible."))
        return
      }

      do {
        try AnchorStore.write(data)
        promise.resolve()
      } catch {
        promise.reject(HealthAnchorException("L'écriture de l'ancre a échoué (\(error))."))
      }
    }
  }

  // MARK: - Observation en arrière-plan

  /** Démarre l'observateur s'il ne tourne pas déjà. Voir la note sur `observerQuery`. */
  private func startObserving() {
    guard observerQuery == nil else { return }

    let query = HKObserverQuery(sampleType: HKObjectType.workoutType(), predicate: nil) { [weak self] _, completionHandler, error in
      self?.handleObserverWake(error: error, completionHandler: completionHandler)
    }

    observerQuery = query
    store.execute(query)
  }

  /**
   Un réveil de `HKObserverQuery`, du début à la fin.

   `pending` garantit que `completionHandler` part une fois, quel que soit le chemin — HealthKit
   ne documente pas ce qui arrive à un double appel, et il n'y a aucune raison de le découvrir en
   production. Le chien de garde (`armWatchdog`) est câblé **avant** l'exécution de la requête
   d'ancre : si `HKAnchoredObjectQuery` elle-même ne rappelle jamais — un scénario qu'Apple ne
   documente pas non plus, mais que rien n'exclut — l'app reste couverte.
   */
  private func handleObserverWake(error: Error?, completionHandler: @escaping HKObserverQueryCompletionHandler) {
    let pending = CompletionGuard(completionHandler)

    // Une erreur ici porte sur l'observation elle-même — un accès révoqué en cours de route,
    // par exemple — pas sur une lecture qui a échoué. Rien à interroger dans ce cas.
    guard error == nil else {
      pending.fire()
      return
    }

    let anchor = AnchorStore.read().flatMap(Self.decodeAnchor)

    // Armé avant l'exécution, pas après avoir vu le résultat : si `HKAnchoredObjectQuery`
    // elle-même ne rappelle jamais — un scénario qu'Apple ne documente pas, mais qu'aucune
    // documentation n'exclut non plus — `completionHandler` part quand même.
    armWatchdog(pending)

    let anchoredQuery = HKAnchoredObjectQuery(
      type: HKObjectType.workoutType(),
      predicate: nil,
      anchor: anchor,
      limit: HKObjectQueryNoLimit
    ) { [weak self] _, added, deleted, newAnchor, queryError in
      guard let self, queryError == nil, let newAnchor else {
        pending.fire()
        return
      }

      // `added` et `deleted` ne sont pas filtrés sur `activityType` — exactement comme
      // `workoutsSince` ne le fait pas. Ce module ne décide jamais ce qui compte comme sport.
      let changed = (added?.count ?? 0) + (deleted?.count ?? 0)

      guard changed > 0, let encoded = try? Self.encodeAnchor(newAnchor) else {
        pending.fire()
        return
      }

      // Rien n'attend d'acquittement ici : l'événement part, et `completionHandler` suivra par
      // le chien de garde armé plus haut, pas par un retour du JS.
      self.sendEvent("onWorkoutsChanged", ["anchor": encoded.base64EncodedString()])
    }

    store.execute(anchoredQuery)
  }

  /**
   Le délai après lequel `completionHandler` part de toute façon, sans attendre le JS.

   Rien dans la documentation Apple ne chiffre le budget d'exécution accordé à ce réveil précis :
   cette valeur est un plafond choisi par prudence, pas une donnée d'Apple, et volontairement
   sous la trentaine de secondes généralement tolérée pour une tâche de fond avant qu'iOS ne
   coupe le processus de toute façon. Elle ne se prouve pas en test — seul un iPhone physique dit
   si le JS a eu le temps de faire quoi que ce soit avant qu'elle expire.
   */
  private static let completionWatchdogSeconds: TimeInterval = 25

  private func armWatchdog(_ pending: CompletionGuard) {
    DispatchQueue.global().asyncAfter(deadline: .now() + Self.completionWatchdogSeconds) {
      pending.fire()
    }
  }

  // MARK: - L'ancre : mise en forme et disque

  /** `HKQueryAnchor` est `NSSecureCoding` ; c'est ce format, pas un JSON maison, qui traverse le
   pont et le disque — il n'y a rien d'autre à en tirer côté client. */
  private static func encodeAnchor(_ anchor: HKQueryAnchor) throws -> Data {
    try NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true)
  }

  private static func decodeAnchor(_ data: Data) -> HKQueryAnchor? {
    try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
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

internal final class HealthBackgroundDeliveryException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "L'activation de la livraison en arrière-plan a échoué : \(param)"
  }
}

internal final class HealthAnchorException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    param
  }
}

/**
 Garantit qu'un `HKObserverQueryCompletionHandler` n'est appelé qu'une seule fois, quel que soit
 le chemin qui y mène — la lecture immédiate quand rien n'a bougé depuis l'ancre, ou le chien de
 garde quand quelque chose a bougé et que le JS ne dit jamais qu'il a fini. HealthKit ne
 documente aucune conséquence à un double appel, mais rien ne garantit non plus qu'il n'y en ait
 pas, et `handleObserverWake` peut atteindre ce point par deux chemins concurrents (la requête
 d'ancre et le chien de garde).
 */
private final class CompletionGuard: @unchecked Sendable {
  private let lock = NSLock()
  private var handler: HKObserverQueryCompletionHandler?

  init(_ handler: @escaping HKObserverQueryCompletionHandler) {
    self.handler = handler
  }

  func fire() {
    lock.lock()
    let toCall = handler
    handler = nil
    lock.unlock()
    toCall?()
  }
}

/**
 L'ancre HealthKit, sur le disque du Keychain — **son propre item, distinct de celui que
 `keyStore.ts` tient déjà côté JS** (service `app.grrind.health`, compte `grrind.sync.idempotency`,
 pour la clé d'idempotence). Service et compte diffèrent ici volontairement : effacer l'un ne
 doit jamais toucher l'autre, la clé d'idempotence et l'ancre n'ayant ni le même cycle de vie, ni
 le même risque en cas de perte.

 `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`, et pas la classe par défaut
 (`whenUnlocked`) : un réveil HealthKit arrive téléphone verrouillé dans une poche, et une classe
 qui exige un déverrouillage courant ferait échouer la lecture précisément dans le cas nominal.
 `ThisDeviceOnly` exclut la sauvegarde iCloud — une ancre restaurée sur un autre appareil ne
 correspond à rien dans le HealthKit de celui-ci.
 */
private enum AnchorStore {
  private static let service = "app.grrind.health.anchor"
  private static let account = "workoutObserverAnchor"

  private static func query() -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account
    ]
  }

  static func read() -> Data? {
    var lookup = query()
    lookup[kSecReturnData as String] = true
    lookup[kSecMatchLimit as String] = kSecMatchLimitOne

    var result: AnyObject?
    let status = SecItemCopyMatching(lookup as CFDictionary, &result)
    guard status == errSecSuccess else { return nil }
    return result as? Data
  }

  static func write(_ data: Data) throws {
    let attributes: [String: Any] = [
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    ]

    let updateStatus = SecItemUpdate(query() as CFDictionary, attributes as CFDictionary)
    if updateStatus == errSecItemNotFound {
      var insert = query()
      insert.merge(attributes) { _, new in new }

      let addStatus = SecItemAdd(insert as CFDictionary, nil)
      guard addStatus == errSecSuccess else {
        throw KeychainWriteError(status: addStatus)
      }
      return
    }

    guard updateStatus == errSecSuccess else {
      throw KeychainWriteError(status: updateStatus)
    }
  }
}

private struct KeychainWriteError: Error, CustomStringConvertible {
  let status: OSStatus
  var description: String { "OSStatus \(status)" }
}
