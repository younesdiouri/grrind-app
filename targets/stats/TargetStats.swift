import SwiftUI
import WidgetKit

/**
 Le widget d'écran d'accueil (#174) : il lit, il n'appelle rien.

 ————— Ce qu'il ne fait pas, et pourquoi ————————————————————————————————————————————————

 Aucun réseau, aucun jeton, aucun trousseau. Le refresh token de GRRIND est à usage unique,
 rotatif et groupé par famille : le serveur révoque **toute la famille** dès qu'un jeton déjà
 consommé revient. L'app sérialise ses rafraîchissements par une promesse partagée, qui ne
 traverse pas une frontière de processus — et une extension en est un. Un widget qui
 rafraîchirait son propre jeton déconnecterait donc l'appareil, par intermittence, sans que
 rien n'accuse le widget.

 Ce serait inutile par-dessus le marché : le budget de rafraîchissement d'un widget est
 décidé par iOS, jamais par l'extension.

 L'app dépose donc l'instantané dans le conteneur partagé et retrace les timelines
 (`GrrindWidgetModule.swift`) ; ici on ne fait que relire.
 */

// MARK: - La timeline

private struct StatsEntry: TimelineEntry {
  let date: Date
  let snapshot: StatsSnapshot?
}

private struct StatsProvider: TimelineProvider {
  /// La vignette de la galerie de widgets, avant que l'instantané existe.
  func placeholder(in context: Context) -> StatsEntry {
    StatsEntry(date: Date(), snapshot: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (StatsEntry) -> Void) {
    completion(StatsEntry(date: Date(), snapshot: readSnapshot()))
  }

  /**
   Une seule entrée, et `.never`.

   Il n'y a rien à prévoir : ces chiffres ne bougent que quand le serveur les change, et c'est
   l'app qui l'apprend — elle appelle alors `reloadAllTimelines()`. Programmer un
   rafraîchissement toutes les heures dépenserait le budget qu'iOS accorde au widget pour
   relire un fichier identique.

   L'âge affiché, lui, se met à jour tout seul : `Text(_:style:.relative)` est une vue vivante,
   elle n'a pas besoin qu'on retrace la timeline pour passer de « 2 min » à « 3 min ».
   */
  func getTimeline(in context: Context, completion: @escaping (Timeline<StatsEntry>) -> Void) {
    completion(Timeline(entries: [StatsEntry(date: Date(), snapshot: readSnapshot())], policy: .never))
  }
}

// MARK: - Le rendu

private struct StatsView: View {
  @Environment(\.widgetFamily) private var family
  let entry: StatsEntry

  var body: some View {
    Group {
      if let snapshot = entry.snapshot {
        filled(snapshot)
      } else {
        empty
      }
    }
    .containerBackground(Color("background"), for: .widget)
  }

  /**
   L'état vide — avant la première publication, ou quand l'instantané n'est pas lisible.

   Il dit quoi faire plutôt que d'afficher des zéros : un niveau 0 et quatre jauges à plat se
   lisent comme un personnage perdu, pas comme un widget qui n'a rien à montrer.
   */
  private var empty: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("GRRIND")
        .font(.caption.weight(.bold))
        .foregroundStyle(Color("accent"))
      Text("Ouvre l'app pour voir ta progression ici.")
        .font(.caption)
        .foregroundStyle(Color("textMuted"))
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private func filled(_ snapshot: StatsSnapshot) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      header(snapshot)
      xpBar(snapshot)

      if family != .systemSmall {
        Divider().overlay(Color("surface"))
        attributes(snapshot)
      }

      Spacer(minLength: 0)
      capturedAt(snapshot)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private func header(_ snapshot: StatsSnapshot) -> some View {
    VStack(alignment: .leading, spacing: 1) {
      HStack(alignment: .firstTextBaseline, spacing: 4) {
        Text("Niveau")
          .font(.caption2.weight(.semibold))
          .foregroundStyle(Color("textMuted"))
        Text("\(snapshot.level)")
          .font(.title2.weight(.heavy))
          .foregroundStyle(Color("celebrate"))
      }

      // Le titre s'efface s'il n'y en a pas : aucun libellé de remplacement, la ligne disparaît.
      if let title = snapshot.title {
        Text(title)
          .font(.caption2)
          .foregroundStyle(Color("textMuted"))
          .lineLimit(1)
      }
    }
  }

  private func xpBar(_ snapshot: StatsSnapshot) -> some View {
    VStack(alignment: .leading, spacing: 3) {
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Capsule().fill(Color("surface"))
          Capsule()
            .fill(Color("accent"))
            .frame(width: geometry.size.width * snapshot.progress)
        }
      }
      .frame(height: 6)

      // Au niveau maximum il n'y a pas de reste à afficher, et « 0 XP restants » se lirait
      // comme une barre sur le point de basculer — ce qui n'arrivera jamais.
      Text(
        snapshot.xpToNextLevel.map { "\(snapshot.xpIntoLevel) / \(snapshot.xpIntoLevel + $0) XP" }
          ?? "Niveau maximum"
      )
      .font(.caption2)
      .foregroundStyle(Color("textMuted"))
    }
  }

  private func attributes(_ snapshot: StatsSnapshot) -> some View {
    VStack(alignment: .leading, spacing: 5) {
      HStack(spacing: 4) {
        Text("Vitalité")
          .font(.caption2.weight(.semibold))
          .foregroundStyle(Color("textMuted"))
        Text("\(snapshot.vitality)")
          .font(.caption.weight(.bold))
          .foregroundStyle(Color("text"))
      }

      HStack(spacing: 10) {
        ForEach(snapshot.attributes, id: \.key) { attribute in
          VStack(alignment: .leading, spacing: 1) {
            Text(attribute.label.uppercased())
              .font(.system(size: 8, weight: .semibold))
              .foregroundStyle(Color("textMuted"))
              .lineLimit(1)
            Text("\(attribute.value)")
              .font(.caption2.weight(.bold))
              .foregroundStyle(Color(attribute.key))
          }
        }
      }
    }
  }

  /**
   L'âge de ce qui est affiché.

   Un widget montre un dernier état connu ; le dire est ce qui l'empêche de mentir le jour où
   l'app n'a pas tourné depuis deux jours. `style: .relative` se réécrit tout seul, sans
   retracer la timeline.
   */
  private func capturedAt(_ snapshot: StatsSnapshot) -> some View {
    HStack(spacing: 3) {
      Text("il y a")
      Text(snapshot.capturedAt, style: .relative)
    }
    .font(.system(size: 9))
    .foregroundStyle(Color("textMuted"))
    .lineLimit(1)
  }
}

// MARK: - La cible

@main
struct StatsWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "app.grrind.stats", provider: StatsProvider()) { entry in
      StatsView(entry: entry)
    }
    // Pas de `AppIntentConfiguration` : il n'y a rien à choisir, donc rien à configurer.
    .configurationDisplayName("Progression")
    .description("Ton niveau, ton XP et tes caractéristiques, sans ouvrir l'app.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
