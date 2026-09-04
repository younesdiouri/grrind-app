# Spec: interface biométrique tactique GRRIND

## Objective

Faire évoluer la direction artistique actuelle d'une application mobile sombre et néon vers une
console biométrique d'entraînement propre à GRRIND. L'interface doit rester immédiatement lisible
au quotidien, mais donner davantage de poids aux moments de progression, de récompense et de
combat.

Le joueur visé consulte plusieurs fois par semaine sa progression, ses séances, son combattant et
son équipement. Le succès n'est donc pas une ressemblance littérale avec une œuvre existante :
c'est une grammaire visuelle cohérente, reconnaissable comme GRRIND, qui reste confortable après
des dizaines d'ouvertures.

La proportion retenue est **70 % console fonctionnelle / 30 % spectacle**. Le spectacle se
concentre sur `SyncSummaryView` et `BattleView`; les écrans de consultation restent plus calmes.

## Direction créative

- Le motif propre à GRRIND est la télémétrie d'entraînement : rails droits, segments interrompus,
  repères de répétition, quatre attributs, cercle de Vitalité et monnaie G.
- La palette sémantique actuelle reste intacte : cyan pour le système et l'XP, blanc pour le
  palier, vert pour le gain, magenta pour la perte ou le refus, cuivre pour la monnaie.
- Les panneaux système importants deviennent presque carrés, à double contour asymétrique. Les
  listes secondaires utilisent un contour simple ou des séparateurs afin de préserver la
  hiérarchie.
- Les formes rondes restent fonctionnelles : avatars, anneaux, jauges et petits statuts. Aucun
  remplacement global et aveugle de `radius.pill`.
- Oxanium SemiBold/Bold, chargée localement depuis un fichier sous SIL Open Font License 1.1,
  devient la police d'affichage des niveaux, titres courts, nombres importants et actions. La
  police système reste celle du texte courant.

## Périmètre fonctionnel

- [x] Ajouter aux tokens un vocabulaire de formes, de traits, de panneaux, de typographie display
      et de mouvement ambiant sans casser les rôles existants.
- [x] Ajouter la police Oxanium et sa licence, chargée à l'exécution avec `expo-font` sans plugin de
      configuration ni rebuild natif imposé.
- [x] Créer `AmbientBackdrop`, fond fixe au viewport composé d'une géométrie statique légère et de
      deux à quatre rails animés au maximum.
- [x] Créer `SystemFrame`, cadre RN réutilisable avec trait extérieur, doublure intérieure,
      segments d'accent asymétriques et variantes de hiérarchie.
- [x] Refaire le composant `Button` sans changer son API publique : contrôle presque rectangulaire,
      bord technique, libellé display et retour d'appui, tout en conservant les états accessible,
      busy et disabled.
- [x] Habiller la barre d'onglets avec un rail supérieur et un indicateur actif angulaire; remplacer
      le bouton retour rond des écrans connectés par un contrôle cohérent et accessible.
- [x] Appliquer le langage calme à l'Accueil et au Sac : backdrop visible, panneau héroïque pour le
      niveau et l'équipement, modules secondaires moins lourds.
- [x] Appliquer le langage événementiel au catalogue Combat, à `BattleView` et à
      `SyncSummaryView` : cadre plus présent, apparition brève des segments et ambiance plus
      lumineuse sans changer la timeline métier.
- [x] Dériver les previews HTML depuis les composants React Native mis à jour, police comprise.
- [x] Ajouter ou adapter les tests purs des tokens, de la géométrie, des variantes et de la
      préférence Réduire les animations.

## Mouvement ambiant

- Une seule horloge Reanimated, portée par le layout connecté, pilote tous les rails visibles.
- Le cycle nominal est lent, de l'ordre de 10 à 16 secondes, et ne déplace que `transform` et
  `opacity` sur deux à quatre éléments.
- Les rails sont fixés au viewport de la scène, derrière le scroll; ils ne sont jamais remontés
  dans une carte. Le catalogue Combat reste statique, car XCTest considère tout calque absolu de
  sa liste virtualisée comme une occultation de la dernière ligne accessible.
- Aucun `setInterval`, aucun `setState` par frame, aucune animation de propriété de layout, aucun
  blur animé et aucun shader.
- Quand `useReducedMotion()` vaut `true` ou `null`, la composition statique reste visible et aucune
  boucle ne démarre.
- La boucle s'arrête quand l'app n'est plus active et au démontage.

## Identité et distance créative

Toujours : construire les formes depuis les systèmes propres à GRRIND et employer uniquement des
assets originaux ou sous licence compatible.

Jamais : reprendre personnages, armes, logos, glyphes, typographies, textes, images, silhouettes de
fenêtres ou compositions exactes des références *Solo Leveling*. Le violet ne devient pas une
couleur décorative générique, car le magenta a déjà un sens de perte/refus dans GRRIND.

## Tech stack vérifiée

- Expo SDK 57.0.12 / React Native 0.86.2.
- Reanimated 4.5.1 et Worklets 0.10.1, déjà installés.
- `react-native-svg` 15.15.4, déjà installé.
- `expo-font` 57, déjà installé; chargement à l'exécution retenu pour rester dans la boucle JS/TS.
- Aucun ajout de Skia, gradient natif, effet de verre ou dépendance native.

Sources officielles :

- https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/
- https://docs.expo.dev/versions/v57.0.0/sdk/svg/
- https://docs.expo.dev/versions/v57.0.0/sdk/font/
- https://docs.swmansion.com/react-native-reanimated/docs/animations/withRepeat/

## Commands

```bash
npm run typecheck
npm run lint
npm test
npm run previews:check
npm run e2e:ios:dev
npm run e2e:ios:flow
git diff --check
```

`npm run e2e:ios:full` est explicitement hors de cette validation : l'utilisateur ne l'a pas
demandé.

## Project structure

- `src/design/` : tokens, décisions pures de géométrie et mouvement, préférence d'accessibilité.
- `src/components/` : `AmbientBackdrop`, `SystemFrame`, `Button` et chrome partagé.
- `src/features/progression/` : panneau héroïque de l'Accueil.
- `src/features/reward/` et `src/features/combat/` : intensité événementielle.
- `src/app/(app)/` : montage du décor, navigation, Sac et écrans de catalogue.
- `src/design/previews.tsx` et `previews/` : dérivés web du design system RN.
- `assets/fonts/` : police et licence associée.

## Code style

Les composants exposent peu de variantes sémantiques et ne contiennent aucune valeur visuelle en
dur :

```tsx
type SystemFrameProps = PropsWithChildren<{
  tier?: 'standard' | 'hero' | 'event';
  accent?: FrameAccent;
}>;

export function SystemFrame({ tier = 'standard', accent, children }: SystemFrameProps) {
  return <View style={frameStyle(tier, accent)}>{children}</View>;
}
```

Les décisions de géométrie restent pures et testables; Reanimated est isolé dans les composants
qui jouent réellement un mouvement afin que les previews Node continuent de fonctionner.

## Testing strategy

- Tests Node ciblés pour les nouveaux tokens, variantes de cadre et décision statique/animée du
  backdrop.
- `typecheck`, lint et suite Node complète après chaque checkpoint.
- `previews:check` après toute évolution d'un composant partagé.
- Boucle Metro iOS avant puis après chaque itération visuelle; lecture effective de toutes les
  captures produites dans `artifacts/e2e/`.
- Vérification sur les états vide, rempli, disabled/busy, Réduire les animations et textes français
  longs.

## Boundaries

- **Toujours :** préserver les testID, rôles/accessibilityState, cibles tactiles d'au moins 44 pt,
  contrastes, comportements métier, ordre des timelines et source de vérité RN des previews.
- **Demander avant :** ajouter une dépendance native, modifier une capacité/configuration native,
  changer le contrat API ou élargir la refonte à une nouvelle fonctionnalité.
- **Jamais :** modifier `grrind-back`, lancer une migration ou réinitialiser sa base, lancer
  `e2e:ios:full`, recalculer une donnée de jeu côté client, copier un asset des références.

## Success criteria

- Les captures Accueil, Combat, Récompense et Sac ne se lisent plus comme une pile uniforme de
  cartes arrondies : leurs panneaux principaux possèdent une hiérarchie de contours visible.
- Le backdrop apporte de la profondeur sans diminuer la lisibilité ni produire de scintillement.
- Les CTA ne sont plus de grands aplats cyan arrondis; leurs états pressé, busy et disabled restent
  immédiatement identifiables.
- Combat et Récompense paraissent plus intenses que les écrans de consultation sans modifier leurs
  séquences ni leur durée métier.
- La typographie display est visible aux emplacements retenus et tous les caractères français
  nécessaires s'affichent correctement.
- Le flow iOS Metro passe et les captures avant/après ont été inspectées et corrigées.
- Toutes les barrières locales listées dans `Commands` passent.

## Not doing

- Refonte métier, navigation fonctionnelle ou contrat API.
- Particules, shaders, Skia, blur animé ou fond vidéo.
- Double cadre sur chaque ligne d'une liste.
- Suppression des cercles fonctionnels et de tous les arrondis.
- Réécriture des timings des séquences de récompense et de combat.
- Validation Release `e2e:ios:full`.

## Open questions

Aucune question bloquante : la direction 70/30, les surfaces de référence et les garde-fous ont été
validés par l'utilisateur le 4 septembre 2026.
