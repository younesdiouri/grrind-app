# #312 — Navigation HUD de jeu

Ticket : https://github.com/younesdiouri/grrind-app/issues/312

## Intention et périmètre

Remplacer l’espace occupé par GRRIND/Inventaire/Boutique en tête des menus par quatre
actions utiles : pièces (boutique), fiole (atelier), sac (onglet Sac), personnage
(apparence). Garder les cinq destinations du bas et le retour des écrans poussés.
Les écrans immersifs de combat/récompense et l’éditeur d’apparence gardent leur navigation dédiée.
Supprimer les répétitions Boutique / La boutique / Le comptoir, Équipement au-dessus
de son propre onglet, Mon apparence en grand, ainsi que les grands raccourcis devenus doublons.
Les noms de joueurs/guildes et titres qui expliquent un état ou une action restent utiles.

## Réalisation par étapes

- [x] HUD pur et preview : quatre boutons illustrés, pièces serveur, états actifs, retour 44 pt.
- [x] Adaptateur SystemHeader partagé : données Query existantes, liens directs, pulsation
  boutique sur l’horloge du décor existante, arrêt sur destination active et Réduire les animations.
- [x] Navigation directe vers Sac ; onglet Inventaire vers Équipement ; apparence inchangée côté sauvegarde.
- [x] Retrait des doublons de titres et raccourcis dans les menus concernés.
- [x] Tests de navigation/états/accessibilité, petites largeurs, types/lint/tests/previews et bundle iOS.
- [ ] Test de l’auteur sur son iPhone avant tout push.

## Architecture et limites

React Native, Expo Router 57, SVG et Reanimated déjà installés. Composant pur `GameHud`
pour les illustrations/mesures et SSR ; `SystemHeader` pour router et Query ; `SystemMotion`
pour la pulsation UI sans boucle JavaScript. Tokens dans `src/design/tokens.ts`.
Exemple : `router.navigate({ pathname: '/inventaire', params: { section: 'bag' } })`.
Le solde vient de `useInventory` ; les invalidations existantes le rafraîchissent.
Pas de faux zéro, compteur de potion ou badge de nouveauté inventé.
Conserver les noms accessibles des boutons sans texte visible supplémentaire.

## Vérification et livraison

Tests Node sur les composants réels et la navigation contrôlée ; commandes ciblées pendant
l’édition, puis `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`,
`rtk npm run previews:check`. Vérification de largeurs 320/390 pt et bundle Metro 8081.
Pas de backend, contrat API, règle de jeu, dépendance, Unity, rebuild natif ou EAS.
Validation visuelle sur le téléphone de l’auteur, avec le build de développement installé.
Travail local seulement ; aucun push/PR/merge sans son feu vert.

## Références consultées

- Accès boutiques des jeux Supercell : https://support.supercell.com/clash-of-clans/en/articles/creator-codes.html
- Menu principal et monnaies Brawl Stars (captures observées en recherche d’images).
- Menu Archero : https://archero.wiki/基本/設定
- Expo SDK 57 : https://docs.expo.dev/versions/v57.0.0/ et `sdk/router/`.

## Contrôles techniques

600 tests réussis, aucun échec ou test ignoré ; TypeScript et lint : sortie 0.
30 previews générées. Boutons mesurés à 44 pt, rang de 52 pt hors safe area.
Sur 320 pt, avec retour, solde compact sans débordement ; VoiceOver annonce le nombre exact.
Le sac et les pièces partagent l’inventaire React Query et ses invalidations existantes.
Les menus secondaires utilisent `dismissTo` : changer de menu ne les empile pas ; l’apparence
garde un retour vers son origine. Les tests appellent la fonction de navigation de production
et simulent le routeur à la frontière.

Le bouton flottant d’Expo recouvrait le HUD : sa hitbox occupe 92 pt, même hors de son dessin.
Source installée : `expo-dev-menu/ios/FAB/DevMenuFABWindow.swift` et `DevMenuFABView.swift`.
Les liens des deux scripts E2E utilisent désormais l’option Expo existante `disableFab=1`,
reconnue par `expo-dev-launcher/ios/EXDevLauncherURLHelper.swift`. Aucun changement natif.
`test:ios:tools` : 4 tests réussis ; syntaxe shell et 4 YAML modifiés valides.
Le parcours HUD est vert : pièces → boutique → atelier → sac, absence de retour sur les onglets,
onglet Inventaire → Équipement, apparence sans titre répété → fermeture, boutique → retour,
accueil. Rapport `artifacts/e2e/report.xml` : 1 flow passé en 88 s. Le dernier passage conserve
la session QA (`E2E_OFFLINE=1`) et ne crée aucun compte supplémentaire. Le préambule gère les
trois pages possibles d’une progression en attente (XP, butin, série), sans en rejouer le test santé.

L’iPhone réel a été lancé via `devicectl` contre Metro 8081 avec `disableFab=1` ; le processus
`app.grrind.dev` a démarré. Aucun rebuild, push, PR ou merge.
`previews:check` et bundle iOS Metro 8081 : sortie 0 / HTTP 200. Le jugement visuel sur le
téléphone reste à l’auteur ; essayer les quatre raccourcis depuis Accueil, Inventaire et Boutique.
