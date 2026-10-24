# Fer play, Huilesson et portée des armes — #271

La demande du 24 octobre autorise la réalisation, les tickets, la délégation du backend à Grrind et la livraison. Deux items facettés suivent l'haltère et les gants existants : FER_PLAY (fer de golf) et HUILESSON (raquette). Les poings (FIST) gardent direct normal/uppercut critique ; les armes longues (SWORD) utilisent taille normale/estoc critique. Le serveur arbitre toujours les coups. `weaponType` et les clés des objets viennent des snapshots, jamais du profil courant.

Plan : générer une référence trois vues par objet, Meshy 7.1 2k/2000 triangles/texture 2k, adapter la prise 25 mm dans Blender, exporter et réimporter. Réutiliser `WeaponGrip` et les poses cylindriques homme/femme. Choisir les gestes depuis les banques livrées avant tout téléchargement supplémentaire. Caler les contacts source sur la phase canonique .5. Remplacer l'écart dépendant de l'écran et l'approche systématique par une portée mesurée en mètres. Vérifier les deux sens, les deux anatomies, des ratios paysage différents et les phases intermédiaires. Préserver le combat Cailloux et le raid.

Backend délégué : grrind-back#319, branche `codex/319-sports-weapons`. `WeaponType = FIST | SWORD`, propriété `weaponType` sur DroppedItem/PublicInventoryLine et références BattleEquipment. Null hors WEAPON ; FIST pour absence d'arme ou anciens snapshots sans champ. Pas de calcul de dégâts client. Contrat tiré et types régénérés, aucun schéma écrit à la main.

Sources : `spikes/art-source/{fer-play,huilesson,sports-weapons}` ; Unity `Assets/Spike/{BattleBridge,FighterPose,WeaponGrip}.cs` et assemblage Editor ; sélection atelier dans `src/app/character-showcase.tsx` et résolution dans `serverAvatar.ts`. Style C#/TS existant, exemple : `weaponType: equipment.WEAPON?.weaponType ?? 'FIST'`.

Vérification : contrôles Blender topology/UV/dimensions/réimport, contrôles Unity du vrai sampler et captures au cadrage de combat ; un flow ciblé après les exports natifs locaux. `npm run typecheck`, `npm run lint`, `npm test`, `npm run previews:check`, `npm run api:check` sur le code final avant push. Utiliser les caches de build existants. Aucun reset de base, aucune nouvelle dépendance, aucune modification des règles de combat. Les captures techniques ne constituent pas un verdict artistique personnel de l'auteur.


## Résultat artistique et calibration

Références créées avec l'outil ImageGen intégré, à partir du style du Poids Lourd ; une planche face/profil/dos par objet. Les prompts décrivent les volumes sportifs facettés, une tête de fer exagérée gris acier, un grip corail, et une raquette ambre à gorge ouverte avec cordage ivoire. Meshy MCP 7.1 : tâches `01a16fa8-e427-72db-beac-2fd2dd86016a` et `01a16fa8-eed4-7412-8608-0588bcf82235`, 35 crédits chacune (70 au total).

Fer play : 1 919 triangles, 850 × 348 × 102 mm, un matériau. Huilesson : 1 677 triangles, 760 × 380 × 84 mm, deux matériaux après remplacement du cordage Meshy incomplet par une grille 5 × 7 de diamètre 4,4 mm. Les poignées sont ramenées à 25 mm pour les poses de doigts existantes. Dimensions et pivots inférés ; aucune retopologie globale ni décimation du mesh texturé. Le réimport FBX conserve triangles, UVs et dimensions à moins de 0,1 mm ; validate.py ne signale aucun échec. Les doublons de sommets signalés viennent des séparations UV/normales conservées.

L'enveloppe extérieure de la tête du fer atteint une IoU alignée de 0,940 contre la référence ; celle du cadre de la raquette, 0,980. Le masque visible complet de sa tête n'atteint que 0,683, car la disposition et l'épaisseur du cordage reconstruit diffèrent du dessin. Cette différence est documentée ; ces comparaisons alignées ne prouvent pas l'échelle réelle. Planches et mesures dans les dossiers `review/` de chaque asset.

Les animations finales sont Mixamo Stable Sword Inward Slash et Standing Torch Melee Attack Stab, exportées sur Remy sans skin en FBX Unity, 30 fps sans réduction. Sword_Dash (saut) et Thrust Slash (enchaînement parasite) sont rejetés. La garde est la première pose de la taille, avec correction du regard. Le contact source est .17 pour la taille, .15 pour l'estoc ; .31 pour le direct, .33 pour l'uppercut. Le sampler conserve le contact canonique .5 et l'horloge serveur.

En PvP, les origines des acteurs sont séparées de 0,70 m, les orientations valent ±85°. Ces valeurs sont indépendantes du ratio de l'écran. L'attaque n'envoie plus de lunge depuis RN et Unity conserve le placement en PvP. Les esquives/réactions gardent leur déplacement. Le placement spécifique de Cailloux et des illustrations anciennes est conservé ; le raid reste un autre rendu.

`SportsWeaponsChecks.Validate()` passe 40 contacts et 8 820 états (5 armes, deux corps, deux sens, sept gestes, 21 phases et trois ratios). Écart maximal entre un point de frappe et un centre tête/torse/bassin : 0,313 m ; ce diagnostic de portée ne représente pas une mesure de collision des surfaces. Les prises restent constantes et les objets s'excluent correctement. Le test poing/torse existant mesure 0,144 et 0,152 m. Le contrôle de projection conserve douze points à 0,000062 px près. Les vérifications existantes des prefabs, de la prise d'haltère et de la présentation finale passent.

Les 24 aperçus équipés sont des captures Unity 512 × 640 (3 hauts × 4 pantalons × 2 armes), avec un cadrage élargi pour conserver tout l'objet. Le garde-fou de regard passe. L'haltère conserve les collisions de retour déjà acceptées pour l'essai décrit dans `le-poids-lourd-pilot.md` ; cette livraison ne prétend pas les avoir supprimées.

Le back #319 est fusionné dans la PR #320 et déployé sur Fly : nouveaux items, icônes issues des meshes finaux, famille figée dans les snapshots. Ses 1 484 tests et ses parcours HTTP achat/équipement/public/PvE/PvP/replay passent. Le client consomme l'export OpenAPI de main.


## Barrières client et natif

Typecheck, lint, 590 tests et 29 previews passent. Les nouveaux tests couvrent la famille figée dans les snapshots/replays, le retrait des deux objets, les vêtements conservés et la disparition de la lunge dépendante de la largeur. Les contrôles Blender des normales mesurent zéro normale opposée aux faces (produit scalaire moyen 0,992 sur les deux objets). Les exports Unity iPhone/Simulator et leurs frameworks compilent ; le xcframework local est assemblé avec les deux tranches. Le development build du Simulator est reconstruit pour embarquer ces données natives.

La section de poignée au point de paume mesure réellement 23,84 × 23,08 mm pour Fer play, 23,41 × 24,45 mm pour Huilesson ; 25 mm est le maximum de calibration, pas un diamètre parfaitement circulaire. Le contrat API passe aussi `npm run api:check` après régénération depuis main.

Le balayage renforcé a reproduit une collision du retour original de l'estoc : la tête de raquette passe à 0,063 m du centre de la tête masculine, phase canonique .6. `SwordStabReturn.anim` conserve les premiers 15 % de la source puis les rejoue en sens inverse, avec le contact au milieu du clip dérivé. La source Mixamo reste intacte. Le même contrôle passe ensuite sur 8 820 états : distance minimale entre la tête des armes longues et le centre du crâne 0,206 m (seuil 0,15 m), sans changer la portée au contact. Cette mesure porte sur les sommets de la moitié distale du mesh, pas sur toutes les collisions de surfaces du corps. Preuves rouge et verte : `head-clearance-before.json` et `unity-validation.json`.

## Preuves iOS

Les deux exports Unity et les frameworks iPhone/Simulator compilent après la correction du retour. Le build Debug iOS réutilise ensuite le projet et les caches existants. Son framework installé a le même UUID et les mêmes SHA-256 pour les 16 fichiers Data que le xcframework exporté : [preuve native](sports-weapons/native-proof.json).

Le flow `quaternius-poc` passe en 204 s : prises, changement de corps, équipement/retrait, gestes, reprise après arrière-plan, duel jusqu’au verdict et retour atelier. Son ancienne assertion sur un texte du HUD Unity est remplacée par le libellé accessible du bouton de passage au bilan, qui annonce maintenant l’adversaire. [Rapport](sports-weapons/quaternius-report.xml).

L’inspection des captures a repéré une première vue figée restée sur l’atelier malgré le marqueur Unity prêt. Le contrôle ciblé attend désormais le scénario et son instant précis. Lancé seul, il réutilise l’initialisation du development client et l’attente de navigation des flows existants. `sports-weapons-contacts` passe en 22 s, ses quatre images sont inspectées en paysage 2048 × 942 : [taille Fer play](sports-weapons/weapons-duel-fer-play-normal.png), [taille Huilesson](sports-weapons/weapons-duel-huilesson-normal.png), [estoc Huilesson](sports-weapons/weapons-duel-huilesson-critical.png), [estoc Fer play](sports-weapons/weapons-duel-fer-play-critical.png). [Rapport](sports-weapons/contacts-report.xml).

[Prise Fer play](sports-weapons/fer-play-male-grip.png), [prise Huilesson](sports-weapons/huilesson-female-grip.png), [duel rapproché](sports-weapons/quaternius-pvp-two-fighters.png), [verdict](sports-weapons/weapons-duel-verdict.png). L’atelier portrait réserve peu de hauteur au personnage lorsque tous les réglages de tenue sont ouverts ; les mesures détaillées de poignée et les planches Unity complètent ces petites vues. Les preuves Simulator ne constituent pas une vérification du candidat TestFlight sur iPhone réel.
