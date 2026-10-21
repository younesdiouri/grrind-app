# Quaternius V1 — base de personnages retenue

Le 21 octobre 2026, après son essai du personnage puis du duel sur Simulator, l’auteur
valide : « ok en vrai je suis convaincu je pense que c'est déjà pas mal pour une v1 ».
Il demande de garder cette seule base et de supprimer les anciens essais.
Le POC #229 / PR #230 est fusionné ; nettoyage : #221.

## Essayer

Dans le development build Unity, ouvrir `grrindapp-dev://character-showcase` ou
**Atelier avatar 3D** dans les réglages/la démonstration de combat. L’ancien lien
`grrindapp-dev://avatar-3d` redirige vers le même atelier.

Un masculin, deux coiffures, bottes/pieds nus, repos/crochet, lecture/pause et cadrages.
**Voir le duel PvP** joue deux hommes Quaternius avec coiffures opposées dans l’arène
et le HUD existants, puis revient en portrait. Les réglages sont locaux ; aucun gain,
défi réseau ni choix d’apparence persistant n’est créé.

## Base et provenance

- Quaternius Universal Base Characters Standard et Modular Character Outfits Fantasy
  Standard, ZIP locaux CC0, licences et provenance dans les dossiers de personnages Unity.
- Le masculin garde le rig Humanoid et les doigts. Les meshes Peasant remplacent le corps
  caché ; os réaffectés par nom. Les bottes sont un vrai mesh skinné, substitué aux pieds nus.
- Blender prépare le raccord du cou par coupe et extrusion sous le col ; pas de volume
  ajouté pour cacher une traversée. Les matériaux utilisent les textures réelles des packs.
- Une seule base 3D est chargée par `BattleBridge` : `Resources/QuaterniusShowcase.prefab`.
  Les anciens corps Muscu, Female, MMO, Meshy, Chunky et Painted et leurs bancs sont supprimés.
- Le sampler `FighterPose` ne garde que le chemin Humanoid Quaternius. Les faux objets
  d’haltère/lunettes et leurs réglages de prise sont retirés. Les apparences historiques
  du serveur ne sont plus traduites en sexe ni équipement 3D fictifs.
- Unity joue la chronologie serveur ; les règles, PV, effets et HUD ne changent pas.
  La scène Arena et les shaders communs sont conservés. Les lumières propres au prefab
  ne s’activent qu’en inspection.

Sources officielles : [Base](https://quaternius.com/packs/universalbasecharacters.html),
[Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html),
[UAL2](https://quaternius.com/packs/universalanimationlibrary2.html).
Les packs complets restent dans `artifacts/quaternius-source/`, ignorés par Git.

## Reproduction

1. Extraire les ZIP Standard locaux sous `artifacts/quaternius-source/`.
2. Exécuter `spikes/art-source/prepare_quaternius_head.py` dans Blender : coupe à 1,56 m,
   prolongement jusqu’à 1,32 m sous le col, poids du raccord sur `spine_03`.
   L’export `FBX_SCALE_ALL` préserve les unités du mélange glTF/FBX.
3. Unity CLI/Pipeline : `QuaterniusPoc.Build()` assemble le prefab et la scène
   `Assets/Spike/QuaterniusPOC/CharacterShowcase.unity`, puis valide rig, os, coiffures,
   bottes/pieds nus, matériaux et correspondance des huit clips/contacts.
4. Pour capturer, utiliser `capture_game_view` en Play. Déplacer les preuves choisies
   hors d’Assets pour éviter de les embarquer.
5. `scripts/unity-ios.sh` exporte et compile les deux tranches du framework local.
   Les binaires restent ignorés ; DerivedData est réutilisé. L’export n’est pas une
   vérification sur iPhone physique.
6. `E2E_FORCE_BUILD=1 npm run e2e:ios:dev` si le framework a changé, puis
   `E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/avatar-3d.yaml`.
   Ce flow appelle maintenant uniquement `quaternius-poc.yaml` : atelier, accessoires,
   animation, arrière-plan, duel et retour portrait. Aucun compte serveur créé.

Le package Assistant IA Unity, utilisé par les anciens essais, est retiré. Le package
Pipeline et les CLI/MCP officiels restent disponibles pour piloter l’éditeur.

## Mesures et preuves de la V1

La base mesure environ 1,82 m, tête anatomique d’environ 0,25 m. Les pièces Peasant totalisent
12 894 triangles ; aucun sommet sans poids dans leur préparation Blender. Cette combinaison
est vérifiée ; elle ne prouve pas une compatibilité avec toutes les morphologies.

Le repos source `Idle_No_Loop` inclinait l’axe de tête de −30,97° à mi-parcours. La variante
`Forward idle.anim` conserve le corps et règle les courbes tête/cou : neck nod .35, head nod .1,
rotations latérales nulles. Le FBX tiers est intact. `ValidateGaze()` en Play sur le vrai sampler
rejette l’ancien clip au seuil de 12° et mesure +2,07 / +0,66 / +2,18 / +0,59 / +1,69° aux
phases 0 / .25 / .5 / .75 / .99.

Les gestes UAL2 actuels sont Idle, Melee_Hook, Idle_Shield_Break, Melee_Hook (critique),
Sword_Block, Sword_Regular_B, Melee_Hook_Rec et Idle (repos). La phase canonique .5 est le
contact ; le crochet atteint sa phase source .74. Une avancée/retour dans l’arène évite le
coup dans le vide. `ValidateDuel()` contrôle les deux sens : écart horizontal poing/torse
15,8 cm / 1,6 cm, seuil 30 cm. C’est une mesure dans le plan caméra, pas une collision physique.

La validation précédant le verdict : compilation Unity et development build réussis,
typecheck/lint, 560 tests, 29 previews et flow ciblé en 1 min 39 s, session
`2026-10-21_194135`. La première exécution Maestro gardait ses coordonnées portrait après
rotation de l’app ; synchroniser le pilote en paysage corrige le test. Le retour portrait est
observé avant réorientation du pilote.

Preuves choisies : `references/quaternius-poc/pvp-app/` (natif), `unity/gaze-after.png`,
`unity/pvp-idle.png`, `unity/pvp-contact.png`. La capture native du duel est une phase de
déplacement ; le contact contrôlé est montré dans la capture Unity dédiée. Les premières
captures du même dossier gardent l’historique de la tête inclinée, corrigée depuis.

## Limites et suite décidée

La tenue Fantasy est une tenue d’essai. Le crochet reste très aérien et les poings stylisés ;
ce n’est pas une chorégraphie sportive finale. Le féminin n’est pas encore intégré. Aucun
nouvel asset Meshy ni téléchargement Mixamo n’est effectué pendant le nettoyage.

- [Back #308](https://github.com/younesdiouri/grrind-back/issues/308) : propre avatar,
  coiffures/coiffes, validation, persistance, contrat OpenAPI et snapshots de combat.
- [App #231](https://github.com/younesdiouri/grrind-app/issues/231) : féminin de la même
  banque, équipements créés via Meshy puis Blender, sélection/retargeting de clips Mixamo.
  Première preuve personnelle avant multiplication des contenus.
- [App #218](https://github.com/younesdiouri/grrind-app/issues/218) : distribution du framework,
  activation production et mesures sur iPhone. Le repli 2D reste utilisé en production/web
  et lorsque le runtime Unity ne démarre pas ; retirer ses assets maintenant casserait ces cas.

Pas de publication EAS ni de changement du back dans cette livraison.

## Vérification après nettoyage #221

Les deux exports et frameworks Unity (Simulator et iPhone arm64) compilent ; le development
build du Simulator est installé sans erreur. Les anciens produits de build sauvegardés
localement sont retirés ; les caches Xcode et le Metro du téléphone sont préservés.

Le code final passe typecheck, lint, **559 tests** et **29 previews**. Le test d’équipement
3D de l’ancien pilote est retiré avec ce comportement ; les tests de chronologie restent.
Le prefab et les contrôles en Play gardent les mêmes mesures de regard et de contact V1.

Le flow ciblé `avatar-3d.yaml` passe en **1 min 46 s**, session `2026-10-21_200937` : atelier,
duel, retour, ancien lien redirigé, puis combat utilisant les avatars par défaut et retour.
Les captures sont inspectées. La première passe automatique était verte mais montrait un
combattant manquant et un retour paysage : l’atelier conservé dans la pile continuait
d’envoyer ses frames, et le verrou d’orientation suivait le montage plutôt que le focus.
Les vues/horloges Unity sont désormais limitées à la route active, et le verrou du combat
se libère au blur. La nouvelle capture montre bien deux personnages ; le retour portrait
mesure **1206 × 2622 px** avant réorientation du pilote, contre **2622 × 1206 px** pour le duel.
Ces dimensions tiennent compte de l’orientation EXIF de la capture iOS.

Les cinq preuves courantes sont dans `references/quaternius-poc/pvp-app/`, notamment
`quaternius-default-pvp.png` et `quaternius-workshop-after-default-pvp.png`.
Le libellé « Muscu » de la fixture de démonstration est un nom affiché, pas l’ancien modèle.
Le Simulator reste sur l’atelier Quaternius et Metro reste disponible pour l’auteur.
