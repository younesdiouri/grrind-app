import ExpoModulesCore
import WidgetKit

/**
 Le côté app du widget : déposer, et prévenir.

 ————— Pourquoi l'app écrit et l'extension lit ————————————————————————————————————————

 Un widget est un **processus distinct**, qui ne partage ni le bundle JavaScript, ni le
 trousseau de l'app, ni sa session. La tentation serait qu'il appelle l'API lui-même ; ce
 serait la pire chose à faire ici. Le refresh token de GRRIND est à usage unique, rotatif et
 groupé par famille : le serveur révoque **toute la famille** dès qu'un jeton déjà consommé
 revient (voir l'invariant n°1 de `CLAUDE.md`). L'app sérialise ses rafraîchissements par une
 promesse partagée — qui ne traverse évidemment pas une frontière de processus. Deux
 rafraîchissements concurrents, un depuis l'app, un depuis l'extension, et l'appareil se
 déconnecte tout seul.

 L'extension n'a donc ni réseau, ni jeton, ni rien à révoquer : elle lit un JSON déjà écrit.

 ————— Le conteneur, retrouvé et non recopié ——————————————————————————————————————————

 L'identifiant du groupe se dérive de celui de l'app, exactement comme `app.config.ts` le
 compose (`group.` + l'identifiant de la variante). Le figer ici obligerait à le tenir d'accord
 avec les trois variantes — `app.grrind`, `.dev`, `.e2e` — et c'est une constante qu'on
 corrigerait deux fois sur trois. `TargetStats.swift` fait le chemin inverse depuis
 l'extension.
 */
public class GrrindWidgetModule: Module {
  /**
   La clé de l'instantané dans le conteneur partagé.

   Une seule, écrasée à chaque publication : le widget affiche un état, pas un journal. Son
   pendant est lu par `TargetStats.swift`, et la forme de ce qu'elle contient est décrite —
   une fois pour les deux côtés — dans `src/features/widget/snapshot.ts`.
   */
  private static let snapshotKey = "snapshot"

  public func definition() -> ModuleDefinition {
    Name("GrrindWidget")

    /**
     Publie l'instantané. `AsyncFunction` plutôt que `Function` pour deux raisons : l'écriture
     ne retient pas le fil JavaScript, et l'appelant peut attendre — ce dont le réveil en
     arrière-plan a besoin, lui qui doit avoir fini avant qu'iOS ne rende la main.

     Un groupe introuvable n'est **pas** une erreur remontée : ça veut dire que l'entitlement
     manque sur ce build, ce qui est un défaut de signature et non quelque chose que
     l'appelant puisse rattraper. Le widget restera simplement sur son dernier état connu, et
     c'est ce qu'il sait déjà faire.
     */
    AsyncFunction("publish") { (payload: String) in
      guard let shared = UserDefaults(suiteName: Self.appGroupIdentifier()) else {
        return
      }

      shared.set(payload, forKey: Self.snapshotKey)

      // Redemander à WidgetKit de retracer sa timeline : sans ça, le fichier est à jour et
      // l'écran d'accueil ne le sait pas avant la prochaine échéance que le système avait
      // prévue — c'est-à-dire potentiellement des heures.
      WidgetCenter.shared.reloadAllTimelines()
    }
  }

  /** `group.` + l'identifiant de **cette** variante de l'app. Voir le docblock de la classe. */
  private static func appGroupIdentifier() -> String {
    "group.\(Bundle.main.bundleIdentifier ?? "app.grrind")"
  }
}
