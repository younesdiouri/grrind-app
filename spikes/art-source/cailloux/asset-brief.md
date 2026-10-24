# Cailloux dans la chaussure — pilote PvE local

ASSET      CR_Cailloux
CATEGORY   creature, biped stone golem
VIEWS      ref/three-views.png: front [0,100,690,790], side [690,100,1130,790], back [1130,100,1774,790]; orthographic approximation, azimuth 0/90/180, elevation 0, uniform scale, ground original y≈740. ImageGen built-in; style references: Ego dumbbell and golden boxing glove.
SCALE      1.30 m height, inferred as a compact enemy beside the 1.8 m Quaternius athlete; Blender Z up, -Y forward; Unity Y up, +Z forward.
PROPORTIONS Front subject approximately 578 px high, 634 px wide; W/H 1.097; shoulders/H .784; torso width/H .517; torso height/H .66; integrated head zone/H .40; fist diameter/H .26; shoe width/H .338; shoe height/H .213; inter-shoe gap/H .173. Approximate landmarks from the generated concept, not an industrial drawing. Re-measure the raw orthographic mesh before rigging.
PARTS      torso/head rigid stone; eyebrows/eyes/mouth integral to torso; upper arms, forearms/fists, thighs, shins, sneakers articulated at anatomical pivots; no simulated parts or finger gestures.
SILHOUETTE Broad angular pebble; tiny legs; oversized closed stone fists; planted sneakers; cyan inset eyes and shoe accents.
MATERIALS  Matte warm slate stone, broad facets, charcoal shoes, cream rubber sole, small cyan accents; one 2K sRGB base color; roughness .85, no metallic, no added texture noise.
ARTICULATION First try Meshy autorig; inspect deformation before accepting. Seven presentation poses: quiet guard, direct heavy punch, short hit recoil, heavy critical, compact avoidance/parry, short combo, counter from guard. No spinning, jumping, idle dancing, foot skating or root drift. Contact canonical phase .5; animation sampling follows existing server timeline only.
INFERRED   Real height, joint centers hidden by stone masses, unseen sole details, attack and counter choreography. Three-view silhouette is newly generated; historic 2D mob is not the positive reference.
TARGET     Unity 6000.3.26f1, FBX Generic rig; 6k triangle generation target, one 2K atlas; existing BattleBridge perspective camera 30° at (0,1.55,4.25) toward (0,.92,0). Review also at 128 px character height and actual iPhone landscape resolution.

## Implementation and checks

1. Generate once through the installed Meshy MCP (35 credits), log task and provenance; validate raw mesh front/side/back and measurements.
2. Rig, review deformation, select short attack/counter; trim and prepare in Blender. Validate weights, ground contacts, action boundaries, event timing and FBX round trip.
3. Import as a Generic rig on its own skeleton; prefab in Resources. Extend the existing presentation resolver by explicit server key `SAND_JACKAL`, which already identifies Cailloux; never match by translated name.
4. Preserve combat outcomes, HUD clock, skip, replay and unknown-mob fallback. Local demo uses existing battle fixtures and awards nothing.
5. Unity phase sheets and runtime sampling, targeted node tests, final typecheck/lint/unit/previews; affected Simulator framework and Debug host only; one relevant Maestro presentation flow with screenshots inspected.

Commands follow the repository wrappers (`rtk`): `npm run typecheck`, `npm run lint`, `npm test`, `npm run previews:check`, `npm run e2e:ios:dev`, `E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/appearances.yaml` (adapted to this pilot).
Sources live here, runtime models in `spikes/Unity3D/Assets/Characters/Cailloux`, prefab in `Assets/Resources`, presentation tests beside `combatCharacters.ts`. Reuse `FighterPose`, `BattleBridge`, existing Unity CLI/MCP, Blender skill scripts and the current iOS development build pipeline. No new dependency, backend write, commit, PR, merge, production build or EAS submission. The author will provide the artistic verdict by testing the Simulator.

## Revue technique avant Simulator

- Meshy : génération 35 + autorig 5 + deux références de mouvement 6 = **46 crédits**. Les deux mouvements bruts ont été rejetés pour déformation du torse et déplacement latéral. Les gestes finaux sont des adaptations IK créées dans Blender, pas les fichiers bruts retouchés à la marge.
- Mesh brut : 6 189 triangles, dimensions 1,42484 × 0,67817 × 1,30 m. Rapport largeur/hauteur 1,09603 contre ≈1,097 prévu. IoU front 0,9542, profil 0,953. La bande frontale 70–80 % présente un écart de largeur de 0,336 de la hauteur au niveau où les poings s’arrêtent ; ce seuil discontinu ne prouve pas une reproduction exacte des membres. Référence générée approximative, écart conservé et déclaré.
- Rig final : 24 os, un maximum de quatre influences normalisées ; le torse et la tête partagent une transformation rigide. Validateur : zéro FAIL ; avertissements sur les sommets aux coutures UV/normales et les influences inférieures à 1 %.
- Huit actions : boucles et retours à la garde identiques (écart final 0 m). Dérive maximale mesurée de 810 sommets de semelle : 0.000000181 m ; rigidité du torse contrôlée sur 1 128 sommets. Aucune pénétration du sol au-delà de l’erreur flottante.
- FBX réimporté dans Blender vierge : 6 189 triangles, 24 os, huit actions de 1 s / 2,5 s, texture présente, hauteur 1,30 m, zéro erreur.
- Unity : sept contacts au cadrage réel en 1920 × 886 ; direct et contre aux phases 0,25 et 0,75 ; horloge Play réellement avancée et console sans erreur du runtime. Distance des centres au contact : héros direct 0,85 m, uppercut 0,65 m, Cailloux 0,80 m ; garde 1,25 m.
- Typecheck, lint, 564 tests et 29 previews passent. Aperçu de menu : rendu Blender du modèle final ; combat : modèle Unity animé.
- Le verdict artistique appartient à l’auteur sur Simulator. Aucun essai iPhone physique, crowd test, commit ou EAS.

Le contrôle des déplacements articulaires entre deux images a ensuite rejeté le retour de parade initial (0,12624 m sur une image). La parade est maintenant ramenée progressivement à la garde avant le contact : maximum 0,05611 m/image pour le contre, et 0,05673 m/image sur l’ensemble des clips à 30 fps, sous la limite de 0,08 m/image. Le test a échoué avant la correction puis passe après ; sorties `joint-bound-red` et `joint-bound-green` dans les logs locaux.

## Simulator — 23 octobre 2026

Le parcours `.maestro/combat-3d.yaml`, extrait du parcours `appearances.yaml` qui conserve ses contrôles Réglages/inventaire, passe : session `2026-10-23_224755`, 1 min 6 s (85 s avec préparation du pilote). Il couvre le duel humain, le jab et le contre de Cailloux aux contacts 1280 ms / 2015 ms, Passer, bilan de défaite, retour portrait, atelier humain, menu Cailloux et victoire naturelle complète suivie du retour au menu. Les captures sélectionnées sont dans `references/quaternius-poc/cailloux/`.

Le premier host sans signature locale avait échoué sur les droits Keychain : corrigé par le build Simulator signé par défaut. Le parcours large a aussi exposé une attente d’aperçu Réglages après démarrage à froid ; ce contrôle reste dans `appearances.yaml`, il n’a pas été supprimé ni présenté comme passant. Le parcours combat indépendant évite de dépendre d’un aperçu hors périmètre. L’attente explicite de la rotation précède le départ interactif.

Le framework et les 16 fichiers Data ont été comparés octet par octet entre export, xcframework, build Debug et app installée. Les trois fichiers de données modifiés par la correction du contre ont été revérifiés après invalidation du dossier xcframework, entrée réelle de la phase CocoaPods. Empreinte enregistrée seulement après compilation, installation et preuve. Framework iPhone antérieur conservé ; seul le Simulator a été reconstruit pour cet essai. Aucun commit, aucun combat réel ni gain attribué côté backend.

Un extrait de cinq secondes du combat réel sur Simulator et une planche de douze images espacées de 0,30 s ont été inspectés (`references/quaternius-poc/cailloux/combat-motion.mp4`, `motion-review.png`) : garde, direct, réaction et retour à la garde lisibles ; pas de retournement du rig ni de geste ajouté. Les approches de combat restent les courtes translations de présentation du bridge existant, distinctes des semelles fixes du clip en place.

## Validation de l’auteur — 24 octobre 2026

Après intégration des variantes de visage et de nez de `main`, le même parcours combat passe en 65 s (`2026-10-24_112346`). Les 16 fichiers Data et l’UUID du framework installé correspondent à l’export ; les limites de silhouette mesurées sur les captures d’attaque et de contre en 2622 × 1206 restent identiques. Typecheck, lint, 564 tests et 29 previews passent. Verdict personnel sur Simulator : « ok ça me va ». L’auteur autorise l’ouverture de la PR et son merge ; l’iPhone physique reste à vérifier lors d’une livraison native.

Les relevés détaillés `review/source-motion.json` et `review/rig-source.json` restent locaux et sont régénérables par les scripts de fabrication. Les sources, contrats d’animation, bilans de validation et preuves sélectionnées restent versionnés.
