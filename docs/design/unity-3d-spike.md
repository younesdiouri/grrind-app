# Personnage Unity dans GRRIND

Ticket : https://github.com/younesdiouri/grrind-app/issues/213.

> Les `AgentScripts` cités ci-dessous (builders, captures, revue) ont été retirés en #226 au
> profit du plugin Unity officiel et du MCP `unity` ; ils restent lisibles dans l'historique Git.

Toute nouvelle génération, posture ou intégration d’avatar suit le skill
`.claude/skills/grrind-character-art/SKILL.md` (#215) et ses barrières G1–G5. Le rendu
livré ici n’a pas passé la barrière DA G4 : il reste une preuve d’intégration, pas une cible.

## Cible et périmètre actuels — 19 octobre 2026

> **Direction remplacée le 19 octobre 2026** : le MMO peint ci-dessous est abandonné au profit
> d'une 3D trapue de jeu mobile récent (esprit Brawl Stars). Brief du nouveau concept :
> `references/chunky-3d/brief.md`. Ce qui suit décrit le spike tel qu'il a été livré.

La référence active est la **planche MMO 3D peinte V2** dans
`references/flyff-3d-proposal/concept-v2.png`, approuvée le 19 octobre.
Proportions compactes, textures mates, tenue neutre et loot sportif distinct.
Le pixel art historique et les précédents mannequins sont rejetés comme rendu final.

Le livrable porte sur **un personnage pilote** dans le vrai `BattleView` de GRRIND,
équipé et animé, testable dans le development build iPhone. Le second corps et la couleur
de peau restent une étape ultérieure. Les anciens sélecteurs de morphologie/peau sont retirés
de cet atelier pour ne pas proposer des réglages sans résultat sur le nouveau modèle.
Pas de modification des règles de combat, de la base serveur ni de publication EAS/TestFlight.

## Construction livrée dans les sources

- Nouveau modèle Meshy 6 Lite à partir d’un patron A-pose dérivé de la V2 ; texture du même
  patron, PBR désactivé. 20 crédits gratuits alloués utilisés, aucun abonnement acheté.
- Blender MCP : rig Humanoid Quaternius CC0 adapté aux proportions ; les doigts générés
  soudés sont remplacés par des mains articulées du pack. Raccords des poignets et texture
  de peau commune. Réduction du brut de 87 818 à environ 32 200 triangles.
- Base sans objets et pieds nus. Course-poursuite suit la tête ; Haltère ego suit une seule
  prise de main ; Sprint-semelle est séparée et son col est skinné mollet/pied.
- Les pieds nus sont un rendu séparé masqué lorsque les chaussures sont portées. Une vraie
  coupe de géométrie aux chevilles évite les triangles de peau qui dépassaient du col.
- Sept gestes issus de Quaternius UAL2 CC0 : garde, attaque, coup reçu, critique, esquive,
  combo et relance. Ils utilisent les temps de contact déjà mesurés par le sampler.
- `Assets/Spike/Arena.unity` référence ce personnage. L’atelier `/avatar-3d` propose trois
  objets, sept gestes, trois phases, l’animation et quatre cadrages, puis le bouton
  **Tester dans le combat**. Il garde le HUD et le déroulé du combat React Native existants.
- Les réglages de ce pilote restent locaux à l’atelier. Aucun nouveau contrat serveur
  de garde-robe ni persistance de personnalisation de compte n’est revendiqué.

Les captures dans `references/flyff-3d-proposal/actual-unity/` sont de vrais rendus Unity,
pas des images de concept. Les captures natives sont distinctes.

## Revue et corrections

`AgentScripts/BuildMMO.cs`, entrée `Review`, produit 84 captures réelles : sept gestes,
deux sens, préparation/contact/retour en pied puis gros plans tête/prise/chaussures au contact.
Les sorties de travail sont dans `artifacts/unity-spike/mmo-v1/review` ; seules quelques preuves
choisies sont versionnées. Attendre quatre changements réels de `Time.frameCount` évite les
captures d’anciens acteurs dont la destruction est différée.

Défauts trouvés et corrigés pendant cette reprise :

| Défaut observé | Correction |
| --- | --- |
| Doigts soudés du modèle généré | Mains articulées CC0, fermeture propre à ce rig |
| Mains de couleur différente | Même échantillon de la texture que l’avant-bras |
| Lunettes enfouies, puis trop hautes/trop éloignées | Calage réel hauteur/profondeur, inspection de face et de trois quarts |
| Équipement presque invisible | Échelle FBX préservée sous les os ; contrôle des dimensions monde |
| Poignée décentrée dans la main | Centre calibré sur les arcs des quatre doigts fermés ; une attache pour tous les gestes |
| Semelle ouverte et lacets flottants | Chaussure fermée simplifiée, sans ces lacets |
| Peau qui dépasse des chaussures | Coupe réelle du mesh, col ajusté au contour de cheville mesuré, poids mollet/pied communs |
| Corps invisible après changement de topologie | Remplacement de l’asset Mesh natif ; `CopySerialized` conservait un buffer de stride incompatible |

Une première passe trouve les défauts ; la seconde repart des exports corrigés. La présence
d’un fichier, un avatar Humanoid valide et un test de coordonnées ne prouvent pas la DA.
Les très gros plans montrent encore la topologie stylisée et les textures générées ; le
personnage n’est pas présenté comme une sculpture retopologisée manuellement au niveau AAA.
Les animations du pack sont adaptées à la présentation du combat, pas une nouvelle chorégraphie.

## Rendu stylisé (#217)

`GRRIND/Painted Toon` remplace `URP/Lit` sur le corps et les objets : la texture porte sa
lumière peinte, le shader n'ajoute qu'une rampe douce à deux tons depuis la lumière principale,
un rim et un contour inverted hull. Les verres ambre restent transparents en `URP/Lit`.
L'arène (`BuildArena.Create`) a une seule lumière clé latérale, un halo de sol et une ombre de
contact sous chaque combattant (`GRRIND/Contact Shadow`, sans shadow map). Le combat passe en
caméra perspective (30°, légèrement plongeante, même cadrage que l'ancien ortho 1,15) ;
l'inspecteur garde ses gros plans orthographiques calibrés.

`BuildMMO.CaptureCombat` capture le cadrage du combat, `BuildMMO.Board` compose la planche G4.
Planche actuelle : `references/flyff-3d-proposal/actual-unity/g4-toon-board.png`. **G4 ne
passe pas encore** : l'ombrage se rapproche du concept, mais les lunettes ont perdu leurs ailes,
les objets restent en aplats et le visage se lit mal. C'est le périmètre de #219, pas du rendu.

## Outils, sources et reconstruction

Workflow et provenance détaillés : `spikes/art-source/README.md`.
Scripts Blender : `rig_mmo_athlete.py`, `finish_mmo_rig.py`, `make_mmo_equipment.py`,
`make_mmo_boots.py`. Les scènes de travail `.blend` restent locales ; le brut, les scripts,
les références, les rapports et les exports Unity sont versionnés.

Outils exécutés : Blender 4.5.14 LTS / MCP for Blender 2.2.0, Meshy sur le site connecté,
Unity 6000.3.26f1 / CLI 1.0.0-beta.13 / Pipeline 0.8.0-exp.1.
Les guides objet/mouvement/revue de GameFactory-3A sont consultés, révision
`db8a6f757c28447285e86f749b54ee98bd512478`. Son pipeline complet, ses backends payants
et ses modèles CUDA ne sont pas installés/exécutés. Pas de génération Unity Assistant.

Crédit du modèle : Meshy, CC BY 4.0, modifications GRRIND. Rig/mains et clips Quaternius :
CC0. Les licences et URLs sont dans `Assets/Characters/MMOAthlete/PROVENANCE.json`
et les dossiers Quaternius existants.

## Intégration et validation

Une seule scène Unity as a Library sous le HUD React Native. Le front envoie l’état de
l’horloge à 30 Hz ; Unity échantillonne les clips. La pose et les doigts sont résolus à
l’origine, puis l’acteur est placé et orienté dans l’arène. Ce séquencement évite que
`HumanPoseHandler` compense la rotation du combattant.

`ReviewAvatars.VerifyPlacement` passe sur les deux instances du personnage pilote après
une translation de 30 cm et une rotation de 60°. Ce contrôle géométrique complète la revue
visuelle, sans la remplacer. Un ennemi illustré reste un sprite ; les monstres ne sont pas migrés.

Validation du code final : typecheck et lint passent ; 560 tests passent ; 29 previews passent.
Les exports Unity iOS arm64 Simulator et appareil, leurs frameworks et les deux development
builds natifs passent. Le flow ciblé `.maestro/avatar-3d.yaml` passe : atelier, équipements,
vrai écran de combat, retour et reprise après arrière-plan. Ses captures ont été inspectées.
Quatre preuves natives sont conservées dans `references/flyff-3d-proposal/actual-app/`.

Le build appareil est installé sur l’iPhone Dyoxel (iPhone 16 Pro) ; le lancement du development
client puis du lien `grrindapp-dev://avatar-3d` réussit. Metro 8081 sert le bundle au téléphone.
Les captures ci-dessus viennent du Simulator : l’installation et le lancement sur appareil ne
valent pas validation visuelle ou mesure de performances sur cet iPhone.

`./scripts/unity-ios.sh` exporte et compile les frameworks arm64 Simulator et iPhone.
Les produits restent ignorés par Git. Seuls les development builds nécessaires sont reconstruits.
Android natif n’est pas implémenté/testé dans ce spike. Les mesures de RAM, de chauffe et
de fluidité soutenue sur appareil restent distinctes de la validation des raccords visuels.
