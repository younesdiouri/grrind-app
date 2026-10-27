# #312 — HUD, inventaire et menu Combat

Ticket : https://github.com/younesdiouri/grrind-app/issues/312

## Résultat attendu

Utiliser l’espace mobile pour jouer : quatre actions dans le HUD (pièces → boutique,
fiole → atelier, sac → Sac, personnage → inventaire complet), sans grands titres répétés.
L’inventaire ouvre Équipement, suivi d’Apparence, Sac et Statistiques. Sa place dans la
barre basse devient Combat, avec deux modes PvE/PvP. Les cinq destinations visibles
restent Accueil, Combat, ʿĀlam, Guilde et Réglages.

## Réalisation

- [x] HUD partagé, boutons de 44 pt, solde serveur, états actifs, retours et liens directs.
- [x] Pulsation boutique sur le décor animé existant, arrêt sur destination active et
  avec Réduire les animations. Aucun compteur ou badge inventé.
- [x] Retrait des titres et raccourcis redondants des menus.
- [x] Personnage du HUD → Équipement ; raccourci Sac conservé ; Inventaire retiré du bas.
- [x] Apparence intégrée à l’inventaire : HUD, quatre sous-onglets et barre basse conservés.
- [x] Unity utilise la hauteur réelle de sa vue parente, hors menus et contrôles.
  Corps conserve `view=0` ; Traits/Cheveux/Yeux conservent le zoom `view=1` existant.
- [x] Combat/PvE propose Cailloux dans la Chaussure et appelle le combat serveur existant,
  avec ses verrous de niveau, son bilan et son historique.
- [x] Combat/PvP propose un Rival d’entraînement et lance une chronologie de duel capturée.
  Démo explicitement signalée, sans récompense, classement, appel de défi ou progression.
  Le raccord aux ligues reste hors périmètre.
- [x] Validation visuelle sur l’iPhone par l’auteur, qui autorise la fusion dans `main`.

## Architecture et limites

React Native et Expo Router 57 déjà installés. `GameHud`, `CharacterTabs` et `CombatMenu`
sont des composants purs avec tokens/previews. `SystemHeader` adapte Query et le routeur ;
les menus secondaires utilisent `dismissTo` pour éviter leur empilement.
`OwnAppearance` réutilise le profil, l’inventaire et l’éditeur existants. La sauvegarde et
le cadrage natif Unity restent inchangés ; seul le viewport normalisé reçoit les bonnes
dimensions. L’inspection publique conserve son écran dédié et son bouton de retour.

Aucun changement backend, contrat API, règle de combat, dépendance, framework Unity ou
configuration native. L’auteur a validé le résultat et demandé la fusion dans `main`.
Livraison par PR, sans rebuild natif ni EAS. Build de développement installé et
Metro iPhone 8081 conservés.

## Vérification

- TypeScript et lint : sortie 0 ; suite complète : **607 tests réussis**, aucun échec ou ignoré.
- Tests de production : destinations du HUD, onglets sélectionnés, verrou serveur PvE,
  bouton PvP relié uniquement à la démo, calcul de viewport intégré/public et dimensions invalides.
- `previews:check` : sortie 0, **31 previews déterministes**.
- `.maestro/hud-navigation.yaml` : **1 flow passé, 139 s**, sans nouveau compte
  (`E2E_OFFLINE=1`, session QA réutilisée). Pièces → boutique → atelier → Sac → Équipement ;
  Apparence avec HUD/onglets/barre basse visibles ; Traits → contrôles visage ; retour Équipement ;
  Combat → Cailloux → PvP → défi démo → bilan sans Bourse → retour Combat puis Accueil.
  Rapport : `artifacts/e2e/report.xml`. Les sept YAML modifiés sont syntaxiquement valides.
- L’iPhone réel a lancé `app.grrind.dev` via `devicectl`, contre Metro 8081 ; bundle HTTP 200.
  L’auteur a validé le rendu sur son téléphone et autorisé la fusion.
- Metro E2E 8082, serveur temporaire des previews et Simulator dédié arrêtés après le contrôle.

L’option Expo existante `disableFab=1` évite que la hitbox de 92 pt du bouton développeur
recouvre le HUD. Sources installées : `expo-dev-menu/ios/FAB/DevMenuFABWindow.swift`,
`DevMenuFABView.swift`, `expo-dev-launcher/ios/EXDevLauncherURLHelper.swift`.
Les deux scripts de lancement l’utilisent ; les quatre tests du harness étaient verts
à l’itération précédente, sans modification du harness depuis.

## Références consultées

- Expo SDK 57 : https://docs.expo.dev/versions/v57.0.0/ et `sdk/router/`.
- Accès boutique Supercell : https://support.supercell.com/clash-of-clans/en/articles/creator-codes.html
- Menu principal et monnaies Brawl Stars (captures observées en recherche d’images).
- Menu Archero : https://archero.wiki/基本/設定
