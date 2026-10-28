import Foundation

@main
struct SportEvidenceChecks {
  static func check(_ value: @autoclosure () throws -> Bool, _ message: String = "") throws {
    let result = try value()
    assert(result, message)
  }

  static func main() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    defer { try? FileManager.default.removeItem(at: directory) }
    let now = Date().timeIntervalSince1970 * 1000
    let store = SportEvidenceStore(directory: directory)
    let point = SportPoint(timestamp: now + 1, latitude: 48, longitude: 2, horizontalAccuracy: 15)
    var capture = SportEvidence(owner: "account-a", origin: "phone", startedAt: now)
    capture.append([point, point, SportPoint(timestamp: now - 1, latitude: 48, longitude: 2, horizontalAccuracy: 15)])
    try check(capture.points.count == 1, "Ni doublons ni position antérieure à l’activation")
    try store.save(capture)
    let restored = SportEvidenceStore(directory: directory)
    try check(try restored.list(owner: "account-b", now: now).isEmpty, "Isolation des comptes")
    try check(try restored.list(owner: "account-a", now: now).first?.id == capture.id, "Identifiant stable après relance")
    capture.append([SportPoint(timestamp: now + 2, latitude: 91, longitude: 2, horizontalAccuracy: 5),
                    SportPoint(timestamp: now + 3, latitude: 48, longitude: 2, horizontalAccuracy: -1)])
    try check(capture.points.count == 1, "Coordonnées invalides écartées")
    let deadline = capture.expiresAt
    capture.endedAt = now + 10
    capture.state = "stopped"
    try store.save(capture)
    try check(capture.expiresAt == deadline, "Un retry ne prolonge pas la rétention")
    try restored.recoverInterrupted(now: now + 20)
    try check(try restored.list(owner: "account-a", now: now).first?.state == "stopped")
    var interrupted = SportEvidence(owner: "account-a", origin: "phone", startedAt: now)
    interrupted.append([point])
    try store.save(interrupted)
    try restored.recoverInterrupted(now: now + 30)
    let recovered = try restored.list(owner: "account-a", now: now).first { $0.id == interrupted.id }
    try check(recovered?.state == "interrupted" && recovered?.endedAt == point.timestamp)
    var route = SportEvidence(owner: "account-a", origin: "route", startedAt: now, endedAt: now + 10,
                              workoutId: "workout", routeId: UUID().uuidString)
    route.append([point, SportPoint(timestamp: now + 11, latitude: 48, longitude: 2, horizontalAccuracy: 5)])
    try check(route.points.count == 1, "Une route ne déborde pas du workout")
    try store.save(route)
    try store.removeReplacedRoutes(owner: "account-a", workoutId: "workout", keeping: [route.routeId!], now: now)
    try check(try store.list(owner: "account-a", now: now).contains { $0.id == route.id })
    try store.removeReplacedRoutes(owner: "account-a", workoutId: "workout", keeping: [], now: now)
    try check(try !store.list(owner: "account-a", now: now).contains { $0.id == route.id }, "Route remplacée supprimée")
    var large = SportEvidence(owner: "account-a", origin: "route", startedAt: now)
    large.append((1...20_001).map { SportPoint(timestamp: now + Double($0), latitude: 48, longitude: 2, horizontalAccuracy: 10) })
    try check(large.points.count == 20_000 && large.state == "limit", "Route volumineuse bornée et statut explicite")
    let uploadDirectory = directory.appendingPathComponent("uploads")
    let outbox = SportUploadOutbox(directory: uploadDirectory)
    let begin = (now / 1000).rounded(.down) * 1000
    let end = begin + 4_000_000
    let iso = ISO8601DateFormatter()
    let startString = iso.string(from: Date(timeIntervalSince1970: begin / 1000))
    let endString = iso.string(from: Date(timeIntervalSince1970: end / 1000))
    let template: [String: Any] = ["source": "APPLE_HEALTH", "externalId": "health-workout", "origin": "PHONE_CAPTURE",
                                   "startedAt": startString, "endedAt": endString]
    let specs: [[String: Any]] = [["nativeOrigin": "phone", "template": template]]
    var phone = SportEvidence(owner: "account-a", origin: "phone", startedAt: begin - 1000)
    phone.append((0...4002).map { SportPoint(timestamp: begin + Double($0 - 1) * 1000, latitude: 48, longitude: 2, horizontalAccuracy: 10) })
    try store.save(phone)
    try outbox.prepare(owner: "account-a", specifications: specs, evidence: [phone], now: now)
    try check(try outbox.next(owner: "account-a", now: now) == nil, "Envoi interdit sans consentement")
    try outbox.enable(true, owner: "account-a", now: now)
    try outbox.prepare(owner: "account-a", specifications: specs, evidence: [phone], now: now)
    let batches = try outbox.read(owner: "account-a", now: now).batches
    try check(batches.map(\.pointCount) == [2000, 2000, 1], "Lots de 2000 et bornes du workout, pas de la capture")
    let first = batches[0]
    try check(SportUploadOutbox.acknowledges(first, responseId: first.id.uppercased()), "UUID serveur canonique indépendant de la casse")
    try check(!SportUploadOutbox.acknowledges(first, responseId: UUID().uuidString), "Ne pas acquitter le mauvais lot")
    let payload = try JSONSerialization.jsonObject(with: first.payload!) as! [String: Any]
    try check(payload["startedAt"] as? String == startString && payload["endedAt"] as? String == endString)
    let sentPoints = payload["points"] as! [[String: Any]]
    try check(Set(sentPoints[0].keys) == ["timestamp", "latitude", "longitude", "horizontalAccuracy"], "Allowlist du contrat, aucune autre donnée Core Location")
    try check(sentPoints.allSatisfy { point in
      guard let timestamp = SportUploadOutbox.date(point["timestamp"]) else { return false }
      return timestamp >= begin && timestamp <= end
    }, "Horodatages ISO UTC dans les bornes du workout")
    let relaunched = SportUploadOutbox(directory: uploadDirectory)
    try relaunched.prepare(owner: "account-a", specifications: specs, evidence: [phone], now: now)
    try check(try relaunched.next(owner: "account-a", now: now)?.payload == first.payload, "Même corps et même UUID après relance")
    try check(try relaunched.next(owner: "account-b", now: now) == nil)
    let purged = try store.purgeUploaded(owner: "account-a", batch: first, now: now).first { $0.id == phone.id }!
    try check(purged.points.count == phone.points.count - first.pointCount, "Purge des points remis, sans perdre les autres bornes")
    try relaunched.acknowledge(owner: "account-a", id: first.id, delivered: true, now: now)
    try relaunched.prepare(owner: "account-a", specifications: specs, evidence: [phone], now: now)
    try check(try relaunched.read(owner: "account-a", now: now).batches.count == 3, "Un lot acquitté ne revient pas sous un nouvel UUID")
    var changed = phone
    changed.points[2] = SportPoint(timestamp: phone.points[2].timestamp, latitude: 49, longitude: 2, horizontalAccuracy: 10)
    try relaunched.prepare(owner: "account-a", specifications: specs, evidence: [changed], now: now)
    let afterChange = try relaunched.read(owner: "account-a", now: now).batches
    try check(afterChange.count == 4 && afterChange.last?.id != first.id, "Corps changé = nouvel identifiant")
    try check(afterChange.first?.payload == nil && afterChange.first?.delivered == true, "Pas de GPS dans le reçu d'acquittement")
    var limited = SportEvidence(owner: "account-a", origin: "phone", startedAt: begin)
    limited.points = large.points
    var limitTemplate = template
    limitTemplate["externalId"] = "limit"
    let limitSpecs: [[String: Any]] = [["nativeOrigin": "phone", "template": limitTemplate]]
    try relaunched.prepare(owner: "account-a", specifications: limitSpecs, evidence: [limited, phone], now: now)
    let limitedBatches = try relaunched.read(owner: "account-a", now: now).batches.filter { $0.externalId == "limit" }
    try check(limitedBatches.reduce(0) { $0 + $1.pointCount } == 20_000 && limitedBatches.allSatisfy { $0.pointCount <= 2000 }, "Plafond total par workout")
    let tiny = SportUploadOutbox(directory: uploadDirectory.appendingPathComponent("tiny"))
    try tiny.enable(true, owner: "account-a", now: now)
    for index in 0..<51 {
      var measure = SportEvidence(owner: "account-a", origin: "phone", startedAt: begin)
      measure.append([SportPoint(timestamp: begin, latitude: 40 + Double(index) / 100, longitude: 2, horizontalAccuracy: 10)])
      try tiny.prepare(owner: "account-a", specifications: specs, evidence: [measure], now: now)
    }
    try check(try tiny.read(owner: "account-a", now: now).batches.count == 50, "Au plus 50 lots pour une séance")
    try relaunched.purgeExpired(now: end + 30 * 86400 * 1000)
    let persisted = try JSONDecoder().decode(SportUploadState.self, from: Data(contentsOf: FileManager.default.contentsOfDirectory(at: uploadDirectory, includingPropertiesForKeys: nil).first { $0.pathExtension == "json" }!))
    try check(persisted.batches.isEmpty, "Purge physique sans compte connecté")
    try FileManager.default.removeItem(at: uploadDirectory)
    try check(try restored.list(owner: "account-a", now: deadline).isEmpty, "Expiration inclusive et purge")
    try check(try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty)
    print("Sport evidence: isolation, reprise, lots immuables, consentement, bornes, validation et purge OK")
  }
}
