# Implementation Plan: interface biométrique tactique GRRIND

## Overview

Construire d'abord les primitives visuelles et leur preuve en preview, puis les déployer par
tranches verticales sur les quatre surfaces de référence. Chaque tranche doit laisser l'app
exécutable et validable visuellement avant la suivante.

## Architecture decisions

- Un seul `AmbientBackdropProvider` vit sous la pile connectée et possède l'horloge; les scènes
  ciblées ne montent que leurs rails de présentation, sous leur contenu.
- Reanimated ne pilote que les rails ambiants et les entrées événementielles. `SystemFrame` et les
  boutons restent rendables dans les previews Node sans Reanimated.
- `SystemFrame` V1 utilise des Views natives et des segments absolus. SVG reste réservé aux formes
  dont un vrai tracé apporte une valeur visible.
- Oxanium est chargée à l'exécution par `expo-font`; son échec laisse l'app démarrer avec la police
  système.
- Les rayons reçoivent des rôles dédiés. `radius.sm/md/pill` ne sont pas écrasés globalement.

## Dependency graph

```text
tokens + font
      ├── SystemFrame ──┬── Accueil
      │                 ├── Combat / Battle
      │                 ├── Récompense
      │                 └── Sac
      ├── Button ─────────── actions de toutes les tranches
      └── AmbientBackdrop ── layout connecté ── scènes transparentes

primitives + écrans ── previews ── flow iOS et inspection des captures
```

## Phase 0: baseline mobile

- Préparer le development build Metro avec `npm run e2e:ios:dev`.
- Jouer `npm run e2e:ios:flow` avant toute itération et inspecter les captures de départ.

## Phase 1: fondations

1. Étendre les tokens de formes, cadres, typographie et mouvement; ajouter leurs tests.
2. Ajouter Oxanium et sa licence, puis intégrer son chargement tolérant à la racine.
3. Construire `SystemFrame`, ses variantes et ses previews.
4. Refaire `Button` sans rupture d'API et vérifier ses états en preview.
5. Construire `AmbientBackdrop`, sa décision reduced-motion et son montage unique.

### Checkpoint: fondations

- Tests ciblés, typecheck et lint au vert.
- Previews générées et inspectées.
- Un flow iOS Metro au vert, captures inspectées avant de généraliser les primitives.

## Phase 2: tranches de consultation

6. Appliquer le langage calme à l'Accueil : niveau héroïque, modules secondaires et historique.
7. Appliquer le langage calme au Sac : bourse, boutique, doublure et équipement.
8. Harmoniser la tab bar et le bouton retour connecté.

### Checkpoint: consultation

- Flow iOS Metro au vert.
- Captures Accueil et Sac inspectées aux états vide/rempli et corrigées.
- Aucun contenu français tronqué et aucune cible tactile réduite.

## Phase 3: tranches événementielles

9. Appliquer les cadres et la typographie au catalogue Combat sans alourdir les adversaires
   verrouillés.
10. Donner à `BattleView` une intensité événementielle et une entrée de cadre sans modifier sa
    timeline.
11. Donner à `SyncSummaryView` le panneau système le plus expressif sans modifier sa timeline ni
    son budget de cartes.

### Checkpoint: événements

- Tests des timelines inchangés et au vert.
- Flow iOS Metro au vert.
- Captures Combat, Battle et Récompense inspectées jusqu'à disparition des chevauchements et pertes
  de contraste.

## Phase 4: dérivés et barrières

12. Finaliser les previews et la documentation devenue obsolète.
13. Passer `npm run typecheck`, `npm run lint`, `npm test`, `npm run previews:check` et
    `git diff --check`.
14. Rejouer le flow iOS Metro final, inspecter toutes les captures, corriger puis rejouer si
    nécessaire.
15. Commits atomiques, push et PR directe après QA réussie. Ne jamais fusionner.

## Risks and mitigations

| Risque | Impact | Mitigation |
| --- | --- | --- |
| Surcharge visuelle | Élevé | Double cadre réservé aux héros/événements; listes simples |
| Overdraw ou animation coûteuse | Élevé | Une horloge, 2–4 rails, transform/opacity seulement |
| Fond invisible sous des scènes opaques | Moyen | Rails montés sous le contenu de chaque scène de référence et vérifiés sur captures |
| Calque absolu pris pour une occultation par XCTest | Élevé | Pas de View plein écran; rails latéraux seuls, et catalogue Combat statique |
| Flash ou blocage de police | Moyen | Chargement runtime borné, fallback système en cas d'erreur |
| Previews Node cassées par Reanimated | Élevé | Isoler Reanimated dans `AmbientBackdrop`; primitives statiques |
| Régression accessibilité | Élevé | Préserver API, états, testID, 44 pt et reduced motion |
| Ressemblance trop littérale | Élevé | Motifs télémétriques GRRIND; aucun asset/glyphe/composition repris |

## Open questions

Aucune question bloquante.
