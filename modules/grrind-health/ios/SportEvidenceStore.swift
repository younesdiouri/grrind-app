import Foundation

// Format local du pilote, indépendant de tout DTO serveur. Dates en millisecondes Unix.
struct SportPoint: Codable {
  let timestamp: Double
  let latitude: Double
  let longitude: Double
  let horizontalAccuracy: Double

  var isValid: Bool {
    timestamp.isFinite && latitude.isFinite && longitude.isFinite && horizontalAccuracy.isFinite
      && (-90...90).contains(latitude) && (-180...180).contains(longitude) && horizontalAccuracy >= 0
  }
}

struct SportEvidence: Codable {
  let id: String
  let owner: String
  let origin: String
  let workoutId: String?
  let routeId: String?
  let startedAt: Double
  // Échéance figée à la création ; pour le téléphone, plus stricte que fin + 30 jours.
  let expiresAt: Double
  var endedAt: Double?
  var state = "recording"
  var points: [SportPoint] = []

  init(owner: String, origin: String, startedAt: Double, endedAt: Double? = nil,
       workoutId: String? = nil, routeId: String? = nil) {
    self.id = routeId ?? UUID().uuidString
    self.owner = owner
    self.origin = origin
    self.startedAt = startedAt
    self.endedAt = endedAt
    self.workoutId = workoutId
    self.routeId = routeId
    self.expiresAt = (endedAt ?? startedAt) + 30 * 24 * 60 * 60 * 1000
  }

  mutating func append(_ incoming: [SportPoint]) {
    var last = points.last?.timestamp ?? startedAt - 1
    for point in incoming.sorted(by: { $0.timestamp < $1.timestamp }) {
      guard point.isValid, point.timestamp >= startedAt, point.timestamp > last,
            endedAt.map({ point.timestamp <= $0 }) ?? true else { continue }
      // Bornage mémoire/disque du pilote. Le statut reste explicite si la route est trop grande.
      guard points.count < 20_000 else { state = "limit"; return }
      points.append(point)
      last = point.timestamp
    }
  }

  var summary: [String: Any] {
    let timestamps = points.map(\.timestamp)
    let accuracies = points.map(\.horizontalAccuracy)
    let gaps = zip(timestamps, timestamps.dropFirst()).map { $1 - $0 }
    return [
      "id": id, "origin": origin, "state": state, "startedAt": startedAt,
      "endedAt": endedAt as Any? ?? NSNull(), "pointCount": points.count,
      "firstPointAt": timestamps.first as Any? ?? NSNull(),
      "lastPointAt": timestamps.last as Any? ?? NSNull(),
      "maxGapSeconds": (gaps.max() ?? 0) / 1000,
      "worstAccuracyMeters": accuracies.max() as Any? ?? NSNull(),
      "workoutId": workoutId as Any? ?? NSNull(), "expiresAt": expiresAt
    ]
  }
}

// Appelé uniquement sur le thread principal : collecte, lecture et purge sont sérialisées.
final class SportEvidenceStore {
  let directory: URL

  init(directory: URL? = nil) {
    self.directory = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("sport-evidence", isDirectory: true)
  }

  func save(_ evidence: SportEvidence) throws {
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    var excluded = URLResourceValues()
    excluded.isExcludedFromBackup = true
    var folder = directory
    try folder.setResourceValues(excluded)
    guard UUID(uuidString: evidence.id) != nil else { throw CocoaError(.fileWriteInvalidFileName) }
    let url = directory.appendingPathComponent(evidence.id + ".json")
    let data = try JSONEncoder().encode(evidence)
    #if os(iOS)
    try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    #else
    try data.write(to: url, options: .atomic)
    #endif
  }

  func list(owner: String, now: Double) throws -> [SportEvidence] {
    try all(now: now).filter { $0.owner == owner }.sorted { $0.startedAt > $1.startedAt }
  }

  func recoverInterrupted(now: Double) throws {
    for var evidence in try all(now: now) where evidence.state == "recording" {
      evidence.state = "interrupted"
      evidence.endedAt = evidence.points.last?.timestamp ?? evidence.startedAt
      try save(evidence)
    }
  }

  func remove(owner: String, now: Double) throws {
    for evidence in try list(owner: owner, now: now) {
      try FileManager.default.removeItem(at: directory.appendingPathComponent(evidence.id + ".json"))
    }
  }

  private func all(now: Double) throws -> [SportEvidence] {
    guard FileManager.default.fileExists(atPath: directory.path) else { return [] }
    var result: [SportEvidence] = []
    for url in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
      where url.pathExtension == "json" {
      let evidence = try JSONDecoder().decode(SportEvidence.self, from: Data(contentsOf: url))
      if evidence.expiresAt <= now {
        try FileManager.default.removeItem(at: url)
      } else {
        result.append(evidence)
      }
    }
    return result
  }
}
