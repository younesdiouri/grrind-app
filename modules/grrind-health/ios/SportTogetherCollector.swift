import CoreLocation
import HealthKit
import UIKit
import ExpoModulesCore

// Pilote de collecte uniquement : aucun appel HTTP, workout créé ou verdict de groupe.
final class SportTogetherCollector: NSObject, CLLocationManagerDelegate {
  private let health = HKHealthStore()
  private let archive = SportEvidenceStore()
  private let outbox = SportUploadOutbox()
  private let location = CLLocationManager()
  private var owner: String?
  private var active: SportEvidence?
  private var safetyTimer: Timer?
  private var permissionReply: (([String: Any]) -> Void)?
  private var collectingRoute = false
  private var generation = UUID()
  private var uploadTask: URLSessionDataTask?
  private(set) var storageFailed = false
  private var now: Double { Date().timeIntervalSince1970 * 1000 }

  override init() {
    super.init()
    location.delegate = self
    location.activityType = .fitness
    location.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    location.distanceFilter = kCLDistanceFilterNone
    location.pausesLocationUpdatesAutomatically = false
    // Une relance ne réactive jamais le GPS. Les points déjà écrits restent consultables.
    do { try archive.recoverInterrupted(now: now); try outbox.purgeExpired(now: now) } catch { storageFailed = true }
  }

  func bind(_ newOwner: String?) throws {
    guard newOwner == nil || (newOwner!.count > 0 && newOwner!.count <= 128) else {
      throw SportCollectionException("Compte invalide.")
    }
    if owner != newOwner { stop(reason: "accountChanged"); uploadTask?.cancel(); generation = UUID() }
    owner = newOwner
  }

  var permissions: [String: Any] {
    let permission: String
    switch location.authorizationStatus {
    case .authorizedAlways, .authorizedWhenInUse: permission = "allowed"
    case .denied, .restricted: permission = "denied"
    default: permission = "undetermined"
    }
    return ["permission": permission, "precise": location.accuracyAuthorization == .fullAccuracy]
  }

  func requestLocationPermission(reply: @escaping ([String: Any]) -> Void) {
    guard location.authorizationStatus == .notDetermined else { reply(permissions); return }
    guard permissionReply == nil else { reply(permissions); return }
    permissionReply = reply
    location.requestWhenInUseAuthorization()
  }

  func status() throws -> [String: Any] {
    guard let owner else { return ["captures": [], "storageFailed": storageFailed, "permission": permissions, "activeCaptureId": NSNull()] }
    if let active, now >= active.startedAt + 4 * 60 * 60 * 1000 { stop(reason: "limit") }
    return ["captures": try archive.list(owner: owner, now: now).map(\.summary),
            "storageFailed": storageFailed, "permission": permissions, "activeCaptureId": active?.id as Any? ?? NSNull(),
            "uploads": try outbox.summary(owner: owner, now: now)]
  }

  func start(expectedOwner: String) throws {
    guard let owner, owner == expectedOwner, active == nil, UIApplication.shared.applicationState == .active else {
      throw SportCollectionException("Ouvre GRRIND et arrête la capture en cours avant de démarrer.")
    }
    guard permissions["permission"] as? String == "allowed" else {
      throw SportCollectionException("Autorise la localisation dans Réglages pour cette capture.")
    }
    let modes = Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes") as? [String] ?? []
    guard modes.contains("location") else {
      throw SportCollectionException("Installe le development build du pilote de collecte.")
    }
    let capture = SportEvidence(owner: owner, origin: "phone", startedAt: now)
    try archive.save(capture)
    active = capture
    storageFailed = false
    location.allowsBackgroundLocationUpdates = true
    location.showsBackgroundLocationIndicator = true
    location.startUpdatingLocation()
    safetyTimer = Timer.scheduledTimer(withTimeInterval: 4 * 60 * 60, repeats: false) { [weak self] _ in
      self?.stop(reason: "limit")
    }
  }

  func stop(reason: String = "stopped") {
    location.stopUpdatingLocation()
    location.allowsBackgroundLocationUpdates = false
    safetyTimer?.invalidate()
    safetyTimer = nil
    guard var capture = active else { return }
    capture.endedAt = min(now, capture.startedAt + 4 * 60 * 60 * 1000)
    capture.state = reason
    do { try archive.save(capture) } catch { storageFailed = true }
    active = nil
  }

  func clear() throws {
    generation = UUID()
    uploadTask?.cancel()
    stop()
    guard let owner else { return }
    try archive.remove(owner: owner, now: now)
    try outbox.clear(owner: owner, now: now)
    storageFailed = false
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if permissions["permission"] as? String != "allowed" { stop(reason: "permission") }
    // Le callback initial peut précéder la réponse à la feuille système.
    guard manager.authorizationStatus != .notDetermined else { return }
    let reply = permissionReply
    permissionReply = nil
    reply?(permissions)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    if (error as? CLError)?.code != .locationUnknown { stop(reason: "locationError") }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard var capture = active else { return }
    guard now < capture.startedAt + 4 * 60 * 60 * 1000 else { stop(reason: "limit"); return }
    var last = max(capture.points.last?.timestamp ?? capture.startedAt - 10_000, capture.deliveredThrough ?? capture.startedAt - 10_000)
    let points = locations.sorted { $0.timestamp < $1.timestamp }.compactMap { value -> SportPoint? in
      let point = Self.point(value)
      guard point.isValid, point.timestamp >= capture.startedAt, point.timestamp <= now,
            point.timestamp - last >= 10_000 else { return nil }
      last = point.timestamp
      return point
    }
    guard !points.isEmpty else { return }
    capture.append(points)
    do {
      try archive.save(capture)
      active = capture
    } catch {
      storageFailed = true
      stop(reason: "storageError")
    }
  }

  func requestRoutes(reply: @escaping (Error?) -> Void) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reply(SportCollectionException("Santé indisponible.")); return
    }
    // Permission séparée : l'import solo ne demande pas l'accès aux itinéraires.
    health.requestAuthorization(toShare: [], read: [HKObjectType.workoutType(), HKSeriesType.workoutRoute()]) { _, error in
      DispatchQueue.main.async { reply(error) }
    }
  }

  func workouts(reply: @escaping ([[String: Any]]?, Error?) -> Void) {
    let predicate = HKQuery.predicateForSamples(withStart: Date(timeIntervalSinceNow: -30 * 86400), end: Date())
    health.execute(HKSampleQuery(sampleType: .workoutType(), predicate: predicate, limit: 50,
      sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]) { _, samples, error in
      let result = (samples as? [HKWorkout] ?? []).map { workout -> [String: Any] in
        ["externalId": workout.uuid.uuidString, "startedAt": workout.startDate.timeIntervalSince1970 * 1000,
         "endedAt": workout.endDate.timeIntervalSince1970 * 1000,
         "activityType": String(workout.workoutActivityType.rawValue),
         "provider": workout.sourceRevision.source.name, "device": workout.device?.model ?? "inconnu"]
      }
      DispatchQueue.main.async { reply(result, error) }
    })
  }

  func collectRoutes(workoutId: String, reply: @escaping (Error?) -> Void) {
    guard let owner, let uuid = UUID(uuidString: workoutId), !collectingRoute else {
      reply(SportCollectionException("Compte ou séance invalide, ou lecture déjà en cours.")); return
    }
    collectingRoute = true
    let generation = self.generation
    let finish: (Error?) -> Void = { error in self.collectingRoute = false; reply(error) }
    health.execute(HKSampleQuery(sampleType: .workoutType(), predicate: HKQuery.predicateForObject(with: uuid),
      limit: 1, sortDescriptors: nil) { _, samples, error in
      DispatchQueue.main.async {
        guard error == nil, let workout = samples?.first as? HKWorkout,
              workout.endDate.timeIntervalSince1970 * 1000 + 30 * 86400 * 1000 > self.now else {
          finish(error ?? SportCollectionException("Séance introuvable ou expirée.")); return
        }
        // Pas de curseur d'import ici : relire retrouve les routes ajoutées/remplacées tardivement.
        self.health.execute(HKSampleQuery(sampleType: HKSeriesType.workoutRoute(),
          predicate: HKQuery.predicateForObjects(from: workout), limit: 100, sortDescriptors: nil) { _, samples, error in
          DispatchQueue.main.async {
            guard error == nil else { finish(error); return }
            guard self.owner == owner, self.generation == generation else {
              finish(SportCollectionException("Lecture annulée.")); return
            }
            let routes = samples as? [HKWorkoutRoute] ?? []
            do {
              try self.archive.removeReplacedRoutes(owner: owner, workoutId: workoutId,
                keeping: Set(routes.map { $0.uuid.uuidString }), now: self.now)
            } catch { finish(SportCollectionException("Purge des anciennes routes impossible.")); return }
            self.readRoutes(ArraySlice(routes), workout: workout, owner: owner,
                            generation: generation, reply: finish)
          }
        })
      }
    })
  }

  private func readRoutes(_ routes: ArraySlice<HKWorkoutRoute>, workout: HKWorkout, owner: String, generation: UUID,
                          reply: @escaping (Error?) -> Void) {
    guard self.owner == owner, self.generation == generation else { reply(SportCollectionException("Lecture annulée.")); return }
    guard let route = routes.first else { reply(nil); return }
    var evidence: SportEvidence
    do {
      let previous = try archive.list(owner: owner, now: now).first { $0.routeId == route.uuid.uuidString }
      evidence = previous ?? SportEvidence(owner: owner, origin: "route",
        startedAt: workout.startDate.timeIntervalSince1970 * 1000, endedAt: workout.endDate.timeIntervalSince1970 * 1000,
        workoutId: workout.uuid.uuidString, routeId: route.uuid.uuidString)
      // Relecture complète par lots : l'ID du fichier demeure stable.
      evidence.points = []
      evidence.state = "recording"
    } catch { reply(SportCollectionException("Stockage des routes indisponible.")); return }
    var finished = false
    let query = HKWorkoutRouteQuery(route: route) { query, locations, done, error in
      DispatchQueue.main.async {
        guard !finished else { return }
        guard self.owner == owner, self.generation == generation else {
          finished = true
          self.health.stop(query); reply(SportCollectionException("Le compte a changé.")); return
        }
        guard error == nil else { finished = true; self.health.stop(query); reply(error); return }
        evidence.append((locations ?? []).map(Self.point))
        if done && evidence.state != "limit" { evidence.state = "complete" }
        do { try self.archive.save(evidence) } catch {
          finished = true
          self.health.stop(query); reply(SportCollectionException("Écriture des routes impossible.")); return
        }
        if done || evidence.state == "limit" {
          finished = true
          self.health.stop(query)
          self.readRoutes(routes.dropFirst(), workout: workout, owner: owner, generation: generation, reply: reply)
        }
      }
    }
    health.execute(query)
  }

  private static func point(_ location: CLLocation) -> SportPoint {
    SportPoint(timestamp: location.timestamp.timeIntervalSince1970 * 1000,
      latitude: location.coordinate.latitude, longitude: location.coordinate.longitude,
      horizontalAccuracy: location.horizontalAccuracy)
  }

  func enableUploads(owner: String, enabled: Bool) throws {
    guard self.owner == owner else { throw SportCollectionException("Le compte a changé.") }
    if !enabled { uploadTask?.cancel() }
    try outbox.enable(enabled, owner: owner, now: now)
  }

  func prepareUploads(owner: String, specifications: String) throws {
    guard self.owner == owner, let data = specifications.data(using: .utf8),
          let values = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
      throw SportCollectionException("Préparation des preuves impossible.")
    }
    try outbox.prepare(owner: owner, specifications: values, evidence: archive.list(owner: owner, now: now), now: now)
  }

  // Le seul accès réseau aux coordonnées. Le pont JS ne reçoit ni les points ni un chemin de fichier.
  func uploadNext(owner: String, endpoint: String, token: String, reply: @escaping ([String: Any]?, Error?) -> Void) {
    guard self.owner == owner, uploadTask == nil, let url = URL(string: endpoint),
          url.path == "/api/workouts/location-evidence", url.user == nil, url.password == nil,
          url.query == nil, url.fragment == nil else {
      reply(nil, SportCollectionException("Envoi des preuves indisponible.")); return
    }
    var allowed = url.scheme == "https"
    #if DEBUG
    if url.scheme == "http", let host = url.host {
      allowed = host == "localhost" || host == "127.0.0.1" || host.hasPrefix("192.168.") || host.hasPrefix("10.")
        || host.hasSuffix(".local") || host.hasPrefix("169.254.")
    }
    #endif
    guard allowed else { reply(nil, SportCollectionException("Adresse de preuve non sécurisée.")); return }
    let batch: SportUploadBatch
    do {
      guard let pending = try outbox.next(owner: owner, now: now) else { reply(["status": 204, "batchId": NSNull()], nil); return }
      batch = pending
    } catch { reply(nil, SportCollectionException("File de preuves indisponible.")); return }
    let current = generation
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.httpBody = batch.payload
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
    request.setValue("fr", forHTTPHeaderField: "Accept-Language")
    let configuration = URLSessionConfiguration.ephemeral
    configuration.timeoutIntervalForRequest = 20
    configuration.httpShouldSetCookies = false
    let session = URLSession(configuration: configuration, delegate: SportNoRedirect(), delegateQueue: nil)
    uploadTask = session.dataTask(with: request) { data, response, error in
      DispatchQueue.main.async {
        session.finishTasksAndInvalidate()
        self.uploadTask = nil
        guard self.owner == owner, self.generation == current else {
          reply(nil, SportCollectionException("Envoi interrompu par changement de compte.")); return
        }
        guard error == nil, let response = response as? HTTPURLResponse else {
          reply(nil, SportCollectionException("Envoi interrompu. Le même lot sera repris.")); return
        }
        let object = data.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
        let status = response.statusCode
        if (200..<300).contains(status) || status == 410 {
          guard status == 410 || SportUploadOutbox.acknowledges(batch, responseId: object?["batchId"]) else {
            reply(nil, SportCollectionException("Réponse de preuve incomplète.")); return
          }
          do {
            for updated in try self.archive.purgeUploaded(owner: owner, batch: batch, now: self.now) {
              if self.active?.id == updated.id { self.active = updated }
            }
            try self.outbox.acknowledge(owner: owner, id: batch.id, delivered: status != 410, now: self.now)
          } catch { reply(nil, SportCollectionException("Acquittement local impossible. Le lot sera relu.")); return }
        }
        // Un refus de validation peut contenir des mesures : seul le type du 401 traverse le pont.
        reply(["status": status, "batchId": batch.id,
               "problemType": status == 401 ? object?["type"] as Any? ?? NSNull() : NSNull()], nil)
      }
    }
    uploadTask?.resume()
  }
}

private final class SportNoRedirect: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
  func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                  newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
    completionHandler(nil)
  }
}

internal final class SportCollectionException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
}
