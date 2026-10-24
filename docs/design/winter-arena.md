# Clairière d’hiver du combat 1v1

Le combat se déroule sur une clairière enneigée facettée, avec sapins étagés, rochers coiffés de neige et crêtes bleutées en arrière-plan. Les volumes simples et les aplats accompagnent les personnages Quaternius. Le centre reste calme et dégagé ; les silhouettes et le HUD gardent la priorité.

Le décor statique vit dans `spikes/Unity3D/Assets/Spike/Winter/` et dans `Arena.unity`, composé avec le CLI officiel Unity. Sa source et sa provenance sont dans `spikes/art-source/winter-arena/`. Le bridge active ce décor uniquement en combat. Le sol de déplacement reste à y=0 ; arbres et rochers sont derrière le couloir, les congères latérales hors de sa largeur. Aucun collider ni calcul de déplacement supplémentaire.

Ordre : composer les volumes et vérifier le cadrage Unity, contrôler les poses et déplacements, exporter les frameworks locaux, réutiliser le development build sur le Simulator dédié et jouer `.maestro/combat-3d.yaml`. L’atelier doit conserver son fond et son cadrage.

Vérification : mesures de dégagement et captures via `unity command script eval` et les commandes de capture officielles ; `E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/combat-3d.yaml`. Avant push : `npm run typecheck`, `npm run lint`, `npm test`, `npm run previews:check`. Pas de changement de contrat, de dépendance ni de livraison EAS.

La réussite demande un combat complet jusqu’au bilan, les deux côtés et leurs approches sans traversée d’un décor, le plan de déplacement conservé au sol et un retour correct à l’atelier.

## Contrôle Unity du 24 octobre 2026

Le décor utilise 1 732 triangles, neuf meshes/matériaux et zéro texture ou collider. `WinterArenaChecks.ValidateMotion()` échantillonne le bridge et les meshes déformés réels : sept poses, onze phases, deux attaquants et trois ratios paysage (2,1 / 2,54 / 2,9), soit 924 volumes de personnage sans intersection avec une facette surélevée du décor. La profondeur occupée va de -0,516 à +0,627 m ; l’extension latérale atteint 2,598 m. Les placements restent à y=0. L’aller-retour combat → inspection → combat passe aussi.

Le contrôle de contact existant `QuaterniusPoc.ValidateDuel()` passe : écart horizontal main/torse de 8,5 et 11,5 cm, sous son seuil de 30 cm. Le décor ne modifie ni l’approche, ni les animations, ni l’horloge des coups.

Revue : les grands sapins encadrent les côtés ; la forêt basse et les crêtes étagées laissent les têtes et le centre lisibles. Les facettes du sol restent discrètes sur la piste. Les volumes statiques évitent d’ajouter une animation concurrente aux attaques. Ces mesures de géométrie ne constituent pas une mesure de performance sur iPhone physique.

## Vérification dans l’app

Les exports Unity iPhone et Simulator et le build Debug de l’app passent. Le framework installé porte l’UUID `636D6671-FE99-3F1C-8319-5E9A6450FDE6` et ses 16 fichiers Data correspondent par SHA-256 à l’export local.

Le parcours `.maestro/combat-3d.yaml` passe en 1 min 7 s le 24 octobre (`2026-10-24_130818`) : duel et rejeu figés, bilan PvP, attaque et contre-attaque de Cailloux, retour à l’atelier et victoire naturelle de 25 actions jusqu’au bilan, sans passer le combat. Le premier essai s’était arrêté avant le combat sur une récompense en attente de la session QA ; ses pages ont été terminées normalement, sans reset ni création de compte.

À 2622 × 1206 px, les zones cyan/violet des pantalons gardent leurs hauteurs (273 / 274 px). Leur largeur passe respectivement de 245 à 244 px et reste à 112 px ; aucun changement de proportions ou de placement n’est mesuré au-delà d’un pixel face à la [capture antérieure](../ai/unity-1v1/pvp-avatar.png).

La revue du bilan a relevé un lien de retour trop clair sur la neige. Son fond sombre et son texte clair reprennent les tokens des commandes existantes. Le même parcours repasse après cette retouche en 1 min 9 s (`2026-10-24_131141`), sans reconstruction native. Les captures finales ont été inspectées. Le typecheck, le lint, les 580 tests et les 29 previews passent après cette retouche. La scène ne change pas le contrat API.

![Duel PvP dans la clairière](winter-arena/pvp.png)
![Combat joué contre Cailloux](winter-arena/combat.png)
![Bilan final et retour contrasté](winter-arena/recap.png)

La validation sur iPhone physique et les mesures de chauffe/mémoire restent à faire lors d’une livraison native. Aucun build EAS de production n’a été lancé.
