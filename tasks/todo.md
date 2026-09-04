# Tasks: interface biométrique tactique GRRIND

## Task 0: capturer la baseline iOS

- [x] Préparer ou réutiliser le development build Metro.
- [x] Jouer le smoke flow avant modification.
- [x] Inspecter et noter les captures Accueil, Combat, Récompense et Sac.
- Verify: `npm run e2e:ios:dev`, puis `npm run e2e:ios:flow`.
- Dependencies: aucune.
- Files: aucun fichier produit suivi par Git.

## Task 1: étendre les tokens visuels

- [x] Ajouter des rôles dédiés aux panneaux, contrôles, traits et mouvements ambiants.
- [x] Préserver les associations sémantiques existantes.
- [x] Couvrir les nouvelles valeurs et invariants par tests.
- Verify: tests ciblés + `npm run typecheck`.
- Dependencies: Task 0.
- Files: `src/design/tokens.ts`, `src/design/tokens.test.ts`.

## Task 2: intégrer Oxanium

- [x] Ajouter les fontes strictement nécessaires et le fichier OFL.
- [x] Charger les fontes à l'exécution sans bloquer durablement le splash.
- [x] Préserver un fallback système en cas d'erreur.
- Verify: typecheck + lancement iOS + caractères français inspectés.
- Dependencies: Task 1.
- Files: `assets/fonts/*`, `src/app/_layout.tsx`, éventuellement un module sous `src/design/`.

## Task 3: créer SystemFrame

- [x] Rendre les tiers `standard`, `hero` et `event` sans valeur visuelle en dur.
- [x] Garder les éléments décoratifs non interactifs et absents de l'accessibilité.
- [x] Ajouter tests purs et previews des variantes.
- Verify: tests ciblés + `npm run previews:check`.
- Dependencies: Task 1.
- Files: `src/components/SystemFrame.tsx`, test/présentation pure associée,
  `src/design/previews.tsx`.

## Task 4: refaire Button

- [x] Conserver props, busy/disabled, accessibilityRole/state et hauteur tactile.
- [x] Remplacer l'aplat arrondi par le contrôle technique validé.
- [x] Vérifier solid, quiet, pressed, busy et disabled.
- Verify: typecheck + previews + flow iOS.
- Dependencies: Tasks 1–3.
- Files: `src/components/Button.tsx`, `src/design/previews.tsx`, snapshots dérivés.

## Task 5: créer AmbientBackdrop

- [x] Géométrie statique légère et deux à quatre rails maximum.
- [x] Une horloge; transform/opacity uniquement; boucle arrêtée hors activité.
- [x] Aucune boucle pour reduced motion `true` ou `null`.
- Verify: tests purs + profiling visuel + flow iOS.
- Dependencies: Task 1.
- Files: `src/components/AmbientBackdrop.tsx`, décision pure/test sous `src/design/`,
  `src/app/(app)/_layout.tsx`.

## Task 6: refondre l'Accueil

- [x] Niveau rendu comme panneau héroïque et modules secondaires allégés.
- [x] Backdrop visible sans nuire au scroll ni au contraste.
- [x] États vide et rempli sans troncature.
- Verify: flow iOS + captures `01-empty-home` et `07-multiple-history` inspectées.
- Dependencies: Tasks 3–5.
- Files: `src/features/progression/PlayerHomeView.tsx`, `src/app/(app)/(tabs)/index.tsx`,
  `src/components/SessionCard.tsx`.

## Task 7: refondre le Sac

- [x] Bourse, boutique et doublure suivent la hiérarchie calme.
- [x] Les emplacements restent lisibles, distincts et tactiles.
- [x] Les ItemCard conservent la rareté comme information prioritaire.
- Verify: flow iOS + captures du Sac avant/après équipement inspectées.
- Dependencies: Tasks 3–5.
- Files: `src/app/(app)/inventaire.tsx`, `src/components/EquipmentBoard.tsx`,
  `src/components/ItemCard.tsx`, `src/components/BagRow.tsx`.

## Task 8: harmoniser le chrome connecté

- [x] Ajouter un rail supérieur et un marqueur actif à la tab bar.
- [x] Remplacer le retour rond connecté par une commande cohérente.
- [x] Préserver titres, routes et testID Maestro.
- Verify: navigation complète du flow iOS.
- Dependencies: Tasks 3–5.
- Files: `src/app/(app)/(tabs)/_layout.tsx`, `src/app/(app)/_layout.tsx`, nouveau contrôle
  partagé éventuel.

## Task 9: refondre le catalogue Combat

- [x] Joueur en panneau héroïque et adversaires disponibles en cadre standard.
- [x] Adversaires verrouillés sobres et clairement inactifs.
- [x] CTA et lien Équipement utilisent les primitives partagées.
- Verify: flow iOS + capture `03-combat-catalog` inspectée.
- Dependencies: Tasks 3–5.
- Files: `src/components/EnemyCard.tsx`, `src/components/PlayerFighterCard.tsx`,
  `src/app/(app)/(tabs)/combat.tsx`.

## Task 10: intensifier BattleView

- [x] Ajouter le cadre événementiel et son entrée brève.
- [x] Ne modifier ni ordre, ni durées métier, ni accessibilité agrégée.
- [x] Respecter reduced motion et les deux camps HP.
- Verify: tests combat + flow iOS + captures combat/bilan inspectées.
- Dependencies: Tasks 3, 5 et 9.
- Files: `src/features/combat/BattleView.tsx`, éventuelle décision pure/test dédiée.

## Task 11: intensifier SyncSummaryView

- [x] Ajouter le cadre événementiel le plus expressif de la gamme.
- [x] Ne modifier ni timeline, ni budget de cartes, ni affordance de sortie.
- [x] Conserver tous les états de titre, loot, bourse et niveau sans chevauchement.
- Verify: tests reward + flow iOS + capture `06-reward-summary` inspectée.
- Dependencies: Tasks 3 et 5.
- Files: `src/features/reward/SyncSummaryView.tsx`, éventuelle décision pure/test dédiée.

## Task 12: finaliser previews et documentation

- [x] Toutes les primitives RN ont un dérivé HTML fidèle.
- [x] La police et les nouveaux tokens sont documentés.
- [x] Aucun rendu généré inattendu ne reste non suivi.
- Verify: `npm run previews:check`.
- Dependencies: Tasks 1–11.
- Files: `src/design/previews.tsx`, `previews/*`, documentation concernée.

## Task 13: passer les barrières finales et livrer

- [x] `npm run typecheck`.
- [x] `npm run lint`.
- [x] `npm test`.
- [x] `npm run previews:check`.
- [x] `git diff --check`.
- [x] Flow iOS Metro final au vert; toutes les captures inspectées et corrigées.
- [x] Commits atomiques avec le numéro du ticket, push et PR ouverte; aucune fusion.
- Dependencies: Tasks 1–12.
- Files: tous les fichiers du ticket.

`npm run e2e:ios:full` ne fait pas partie de cette tâche.
