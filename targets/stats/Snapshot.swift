import Foundation

/**
 Ce que le widget lit, et rien de ce qu'il en fait.

 Séparé de `TargetStats.swift` pour une raison précise : **ce fichier n'a besoin que de
 Foundation**, donc le décodage se rejoue hors de l'app, hors du Simulator et hors de Xcode.
 C'est le seul endroit du ticket où une erreur ne serait vue par aucun compilateur — un champ
 renommé d'un côté du pont, une date au mauvais format — et la compilation des deux cibles ne
 dit rien du tout là-dessus.
 */

/**
 La forme de l'instantané — décrite **une fois pour les deux processus** dans
 `src/features/widget/snapshot.ts`, qui la produit. Tout y est déjà calculé : c'est du
 TypeScript pur, donc prouvé sans appareil, ce qu'aucune arithmétique écrite ici ne serait.
 */
struct StatsSnapshot: Decodable {
  struct Attribute: Decodable {
    /// Aussi le nom du colorset — voir `colors` dans `expo-target.config.js`.
    let key: String
    let label: String
    let value: Int
  }

  let version: Int
  let level: Int
  let title: String?
  let xpIntoLevel: Int
  let xpToNextLevel: Int?
  /// Déjà borné à [0, 1] côté TypeScript, niveau maximum et palier de largeur nulle compris.
  let progress: Double
  let vitality: Int
  let attributes: [Attribute]
  let capturedAt: Date
}

/**
 La version que cette extension sait lire.

 iOS garde l'ancienne extension vivante un moment après le remplacement de l'app : un
 instantané écrit par une app plus récente peut donc arriver ici. On préfère l'état vide —
 « ouvre GRRIND » — à des champs manquants rendus en zéros, qui se liraient comme une
 régression du personnage.
 */
let supportedVersion = 1

let snapshotKey = "snapshot"

/**
 `group.` + l'identifiant de l'app hôte, retrouvé plutôt que recopié.

 Une extension vit dans `…/GRRIND.app/PlugIns/stats.appex` : remonter deux niveaux donne le
 bundle de l'app, donc son identifiant. C'est ce qui fait que les trois variantes — `app.grrind`,
 `app.grrind.dev`, `app.grrind.e2e` — trouvent chacune *leur* conteneur sans qu'aucune constante
 ne soit à tenir d'accord ici. Deux variantes installées ne se marchent jamais dessus, et c'est
 la même raison qui leur donne des identifiants distincts (voir `app.config.ts`).
 */
func appGroupIdentifier() -> String {
  let hostBundleURL = Bundle.main.bundleURL
    .deletingLastPathComponent()
    .deletingLastPathComponent()
  let identifier = Bundle(url: hostBundleURL)?.bundleIdentifier
    ?? Bundle.main.bundleIdentifier
    ?? "app.grrind"

  return "group.\(identifier)"
}

/// L'instantané du conteneur partagé, ou `nil` s'il n'y en a pas encore.
func readSnapshot() -> StatsSnapshot? {
  guard let shared = UserDefaults(suiteName: appGroupIdentifier()),
        let payload = shared.string(forKey: snapshotKey)?.data(using: .utf8)
  else {
    return nil
  }

  return decodeSnapshot(payload)
}

/**
 Le décodage, séparé de la lecture pour qu'il se rejoue sans conteneur partagé — voir le
 docblock en tête de fichier.

 Rend `nil` dans les deux cas où le widget doit retomber sur son état vide plutôt que
 d'inventer : un JSON illisible, et une **version** qu'il ne connaît pas. iOS garde l'ancienne
 extension vivante un moment après le remplacement de l'app, donc un instantané écrit par une
 app plus récente arrive bel et bien ici.
 */
func decodeSnapshot(_ payload: Data) -> StatsSnapshot? {
  let decoder = JSONDecoder()
  // `Date#toISOString()` écrit toujours les millisecondes ; `.iso8601` seul les refuse.
  decoder.dateDecodingStrategy = .custom { decoder in
    let container = try decoder.singleValueContainer()
    let text = try container.decode(String.self)

    guard let date = isoFormatter.date(from: text) else {
      throw DecodingError.dataCorruptedError(
        in: container,
        debugDescription: "Date ISO 8601 illisible : \(text)"
      )
    }

    return date
  }

  guard let snapshot = try? decoder.decode(StatsSnapshot.self, from: payload),
        snapshot.version == supportedVersion
  else {
    return nil
  }

  return snapshot
}

let isoFormatter: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()
