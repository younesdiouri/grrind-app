# #328 — profil et ligues, essai avant push

Essai iPhone et retours validés le 1er novembre 2026. Accord de l’auteur : « ok top tu peux push
et merge pas la peine de déployer ». Push et fusion autorisés ; aucun déploiement prévu.

## Ce qui est livré

- Une identité compacte : visage/cou, pseudo, titre éventuel, ligue et niveau indépendant.
  Après le premier essai iPhone : Défier conserve sa logique et précède l’avatar équipé en
  pied, seul dans son cadre. Aucun onglet Équipement/Sac/Statistiques, bouton 3D, caractéristique,
  note de Vitalité ou progression n’apparaît sur ce profil public. L’inventaire personnel reste
  accessible par sa navigation habituelle.
- Un seul assemblage SVG de cadre, facettes et ailerons, piloté par cinq presets. L’état
  statique est complet. Les lumières décoratives s’arrêtent au blur, en arrière-plan et avec
  Réduire les animations ; aucun résultat de ligue ne déclenche une célébration au montage.
- Le portrait utilise la caméra tête Unity existante (`view: 1`, centrée sur l’os Head),
  resserrée de 1,6× à l’affichage pour exclure le torse. La capture est suréchantillonnée à
  3,2× ; ce n’est pas un recadrage d’une image en pied. Même calibrage pour les deux corps.
  Le retour de l’auteur remplace la consigne initiale sans coiffe : le bandeau équipé est
  désormais conservé dans la vignette. Les armes et vêtements sont réservés à l’avatar en pied.
  Cache borné à six configurations, sans ligue dans la clé, réponses obsolètes ignorées.
- Ma semaine n’est disponible que pour soi : GET `/api/league`, valeurs serveur, dates Paris,
  résultat précédent, état neuf/non classé et erreurs récupérables. Après l’échéance, l’écran
  attend la clôture serveur et réinterroge toutes les cinq secondes tant qu’il reste affiché.
- Contrat tiré de `grrind-back/main` et types générés, sans DTO ni modification manuelle du YAML.
  Aucune dépendance ajoutée, aucun changement Unity/natif, aucun rebuild nécessaire.

## Contrôles du 1er novembre 2026

- Typecheck, lint, 637 tests unitaires : verts après intégration des retours.
- `api:check` et `previews:check` : verts, previews générées stables après le commit local.
- API locale réelle : un compte jetable, GET league/me/player en 200, Bronze neuf, rang null,
  non-participation, identités cohérentes et joueur inconnu en 404. Aucune migration ni remise
  à zéro de base. Rapport : `artifacts/e2e/2026-11-01-328-leagues/api-report.json`.
- Première version : captures natives du Simulator, 1206×2622 pixels (402×874 points), cinq ligues avec le même
  avatar, corps féminin et textes longs. Planche couleur/gris à cadrage identique 354×299 pt :
  `artifacts/e2e/2026-11-01-328-leagues/comparison.png`.
  Largeurs éclairées du décor mesurées sur les captures : Bronze 140,7 pt, Argent 211,3 pt,
  Or 229,3 pt, Platine 239,3 pt, Diamant 272 pt. Seuil/zone documentés dans `visual-metrics.json`.
  Les captures montrent le composant réel avec des données de démonstration ; elles ne valent
  pas validation d’un profil équipé réel sur l’iPhone.
- Après les retours : `artifacts/e2e/2026-11-01-328-leagues/profile-feedback.png` confirme le
  bandeau dans la vignette et l’avatar en pied seul, sans statistiques ni contrôles d’inventaire.
  Le showcase réutilise désormais exactement le composant du profil public. Le flow existant
  `inventory-profile.yaml` est adapté à la nouvelle présentation ; il n’a pas été rejoué pour
  ce changement visuel.
- Previews RN web : cinq états côte à côte, repli sans Unity, titre null et textes longs,
  semaine neuve, projection et clôture en cours. Le générateur conserve ses avertissements RN
  web existants sur les propriétés d’accessibilité/pointerEvents.

## Test sur l’iPhone

Le binaire `app.grrind.dev` est installé sur Dyoxel (iPhone 16 Pro). Le premier essai iPhone a
été réalisé par l’auteur ; ses retours ont été intégrés, puis il a validé la fusion.

Metro 8081 est laissé actif, sans mode E2E, avec `EXPO_PUBLIC_API_URL=https://grrind-back.fly.dev`.
Déverrouiller l’iPhone, le garder sur le même réseau que le Mac, puis ouvrir GRRIND dev sur le
serveur `http://192.168.1.14:8081`. Le QR dans le dossier des captures ouvre le dev-client.
L’adresse LAN peut changer ; elle est celle du Mac au moment de cet essai.

1. Dans Guilde → Membres, toucher un autre joueur : vérifier visage/cheveux, pseudo, titre,
   ligue et Défier sans scroller. Utiliser notamment un joueur portant une coiffe et une arme.
   Le bandeau doit être visible dans la vignette de ligue. L’avatar en pied conserve sa tenue
   et son arme, sans liste d’objets, onglets, statistiques ni bouton 3D.
2. Ouvrir sa propre ligne de membre puis toucher sa ligue : vérifier Ma semaine, actualiser,
   fermer. Un autre joueur n’a pas ce panneau et son propre profil n’a pas Défier.
3. Défier un membre puis revenir au profil. Vérifier aussi le profil après avoir changé son
   bandeau ou son apparence depuis l’inventaire personnel.
4. Pour comparer les cinq ligues sans modifier le compte : ouvrir
   `grrindapp-dev://league-showcase`. Les boutons changent ligue, corps et textes longs ; ce
   parcours de développement emploie des données de démonstration et ne lance pas de défi.
5. Activer Réduire les animations sur l’iPhone : vérifier que tous les ornements restent
   présents, sans pulsation ni déplacement. Revenir à l’app après l’avoir mise en arrière-plan.

L’accord de l’auteur sur l’essai iPhone autorise la fusion. La clôture et les mouvements sont
prouvés par les tests/fixtures ; aucune semaine réelle n’a été forcée et aucune donnée de ligue
n’a été modifiée sur Fly.

Pour relancer Metro si nécessaire :

```sh
rtk proxy env EXPO_PUBLIC_API_URL=https://grrind-back.fly.dev npm start -- --lan --port 8081
```

Le Simulator de vérification est arrêté. Les serveurs utiles à l’essai (Metro 8081 et previews
8094) sont conservés. Aucun flow Maestro supplémentaire ni build natif/production n’a été lancé.
