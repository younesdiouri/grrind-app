import Foundation
import CryptoKit

// Conteneurs locaux privés ; le template JSON est fourni par les types OpenAPI générés côté JS.
struct SportUploadBatch: Codable {
  let id: String
  let workoutKey: String
  let externalId: String
  let nativeOrigin: String
  let fingerprint: String
  let expiresAt: Double
  let pointCount: Int
  var payload: Data?
  var delivered = false
}

struct SportUploadState: Codable {
  var enabled = false
  var batches: [SportUploadBatch] = []
}

final class SportUploadOutbox {
  private let directory: URL
  init(directory: URL? = nil) {
    self.directory = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("sport-upload", isDirectory: true)
  }

  func read(owner: String, now: Double) throws -> SportUploadState {
    let url = file(owner)
    guard FileManager.default.fileExists(atPath: url.path) else { return SportUploadState() }
    var state = try JSONDecoder().decode(SportUploadState.self, from: Data(contentsOf: url))
    let count = state.batches.count
    state.batches.removeAll { $0.expiresAt <= now }
    if count != state.batches.count { try save(state, owner: owner) }
    return state
  }

  func purgeExpired(now: Double) throws {
    guard FileManager.default.fileExists(atPath: directory.path) else { return }
    for url in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
      where url.pathExtension == "json" {
      var state = try JSONDecoder().decode(SportUploadState.self, from: Data(contentsOf: url))
      let count = state.batches.count
      state.batches.removeAll { $0.expiresAt <= now }
      if state.batches.count != count { try write(state, to: url) }
    }
  }

  func enable(_ enabled: Bool, owner: String, now: Double) throws {
    var state = try read(owner: owner, now: now)
    state.enabled = enabled
    try save(state, owner: owner)
  }

  func clear(owner: String, now: Double) throws {
    var state = try read(owner: owner, now: now)
    state.enabled = false
    // Garder les empreintes sans GPS évite de renvoyer un ancien lot sous un nouvel ID.
    for index in state.batches.indices { state.batches[index].payload = nil }
    try save(state, owner: owner)
  }

  func prepare(owner: String, specifications: [[String: Any]], evidence: [SportEvidence], now: Double) throws {
    var state = try read(owner: owner, now: now)
    guard state.enabled else { return }
    for specification in specifications.prefix(100) {
      guard let template = specification["template"] as? [String: Any],
            let nativeOrigin = specification["nativeOrigin"] as? String,
            let externalId = template["externalId"] as? String,
            let source = template["source"] as? String,
            let start = Self.date(template["startedAt"]), let end = Self.date(template["endedAt"]),
            end >= start, end - start <= 86400 * 1000, end + 30 * 86400 * 1000 > now else { continue }
      let key = source + ":" + externalId
      var byTimestamp: [Double: SportPoint] = [:]
      for capture in evidence where capture.owner == owner && capture.origin == nativeOrigin
        && (nativeOrigin == "phone" || capture.workoutId == externalId) {
        for point in capture.points where point.isValid && point.timestamp >= start && point.timestamp <= end {
          if let previous = byTimestamp[point.timestamp], previous.horizontalAccuracy <= point.horizontalAccuracy { continue }
          byTimestamp[point.timestamp] = point
        }
      }
      let points = byTimestamp.values.sorted { $0.timestamp < $1.timestamp }
      for offset in stride(from: 0, to: points.count, by: 2000) {
        var chunk = Array(points[offset..<min(offset + 2000, points.count)])
        var body = template
        body["points"] = chunk.map(Self.describe)
        var fingerprint = try Self.fingerprint(body)
        if state.batches.contains(where: { $0.fingerprint == fingerprint }) { continue }
        let existing = state.batches.filter { $0.workoutKey == key }
        let remaining = 20_000 - existing.reduce(0) { $0 + $1.pointCount }
        guard remaining > 0, existing.count < 50 else { break }
        if chunk.count > remaining {
          chunk = Array(chunk.prefix(remaining))
          body["points"] = chunk.map(Self.describe)
          fingerprint = try Self.fingerprint(body)
          if state.batches.contains(where: { $0.fingerprint == fingerprint }) { continue }
        }
        let id = UUID().uuidString.lowercased()
        body["batchId"] = id
        let payload = try JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])
        state.batches.append(SportUploadBatch(id: id, workoutKey: key, externalId: externalId,
          nativeOrigin: nativeOrigin, fingerprint: fingerprint, expiresAt: end + 30 * 86400 * 1000,
          pointCount: chunk.count, payload: payload))
      }
    }
    // Écriture atomique avant le premier appel réseau, jamais un ID par tentative.
    try save(state, owner: owner)
  }

  func next(owner: String, now: Double) throws -> SportUploadBatch? {
    let state = try read(owner: owner, now: now)
    return state.enabled ? state.batches.first { $0.payload != nil } : nil
  }

  func acknowledge(owner: String, id: String, delivered: Bool, now: Double) throws {
    var state = try read(owner: owner, now: now)
    guard let index = state.batches.firstIndex(where: { $0.id == id }) else { return }
    state.batches[index].payload = nil
    state.batches[index].delivered = delivered
    try save(state, owner: owner)
  }

  func summary(owner: String, now: Double) throws -> [String: Any] {
    let state = try read(owner: owner, now: now)
    return ["enabled": state.enabled, "pending": state.batches.filter { $0.payload != nil }.count,
            "delivered": state.batches.filter(\.delivered).count]
  }

  private func file(_ owner: String) -> URL {
    let name = SHA256.hash(data: Data(owner.utf8)).map { String(format: "%02x", $0) }.joined()
    return directory.appendingPathComponent(name + ".json")
  }

  private func save(_ state: SportUploadState, owner: String) throws {
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    var folder = directory
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try folder.setResourceValues(values)
    try write(state, to: file(owner))
  }

  private func write(_ state: SportUploadState, to url: URL) throws {
    let data = try JSONEncoder().encode(state)
    #if os(iOS)
    try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    #else
    try data.write(to: url, options: .atomic)
    #endif
  }

  private static func fingerprint(_ body: [String: Any]) throws -> String {
    SHA256.hash(data: try JSONSerialization.data(withJSONObject: body, options: [.sortedKeys]))
      .map { String(format: "%02x", $0) }.joined()
  }

  static func date(_ value: Any?) -> Double? {
    guard let string = value as? String else { return nil }
    return (fractional.date(from: string) ?? seconds.date(from: string)).map { $0.timeIntervalSince1970 * 1000 }
  }

  static func acknowledges(_ batch: SportUploadBatch, responseId: Any?) -> Bool {
    guard let string = responseId as? String, let uuid = UUID(uuidString: string) else { return false }
    return uuid == UUID(uuidString: batch.id)
  }

  private static let fractional: ISO8601DateFormatter = {
    let value = ISO8601DateFormatter()
    value.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return value
  }()
  private static let seconds = ISO8601DateFormatter()

  private static func describe(_ point: SportPoint) -> [String: Any] {
    return ["timestamp": fractional.string(from: Date(timeIntervalSince1970: point.timestamp.rounded() / 1000)),
            "latitude": point.latitude, "longitude": point.longitude, "horizontalAccuracy": point.horizontalAccuracy]
  }
}
