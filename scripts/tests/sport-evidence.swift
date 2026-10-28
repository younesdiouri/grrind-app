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
    try check(try restored.list(owner: "account-a", now: deadline).isEmpty, "Expiration inclusive et purge")
    try check(try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty)
    print("Sport evidence: isolation, reprise, dédoublonnage, validation et purge OK")
  }
}
