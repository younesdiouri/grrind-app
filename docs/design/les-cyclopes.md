# Les Cyclopes — pilote iPhone (#350)

Accessoire de cyclisme cumulable avec HEAD : visière Meshy miroir rose/orange/or, monture
violette continue vers des branches sport violet/citron. Atelier uniquement, sans catalogue
serveur, loot ni tenue sauvegardée. L’auteur juge le modèle porté sur son iPhone.

## Trajet de la branche — schéma de l’auteur

La référence actuelle est `ref/ear-route-author-sketch.jpg` : départ bas et large dans le
côté violet, amincissement vers le sommet de l’oreille, puis coude descendant derrière elle.
La photo `continuous-frame-reference.webp` guide la continuité de matière. Les deux dernières
corrections restaient trop hautes : souder la branche à la monture ne suffisait pas à obtenir
la silhouette tracée. La barre haute uniforme de 8 mm est remplacée, sans déplacer le verre.

La reprise part de la section arrière de la vraie pièce violette. Cette partie de la
monture est reformée progressivement jusqu’à la section de branche ; les bords de coupe
sont directement partagés avec la branche. Aucun bouchon ni second volume superposé au
raccord. La même teinte violette traverse la jonction ; l’accent citron commence plus loin,
sur la face extérieure de la branche.

| Corps | Triangles livrés | Distance iris/verre | Départ / appui d’oreille | Arêtes partagées gauche/droite |
| --- | --- | --- | --- | --- |
| Homme | 3 381 | 24,7–29,6 mm | 18 / 6 mm de haut | 30 / 29 |
| Femme | 3 387 | 24,4–29,9 mm | 18 / 6 mm de haut | 32 / 29 |

Le centre du départ est 11,2 / 13 mm sous le sommet de l’oreille. Son bord supérieur reste
presque droit, tandis que le bas s’affine vers l’appui. L’épaisseur est de 4 mm. Le retour
commence derrière le contour postérieur de l’oreille et finit environ 21 mm sous son sommet,
avec une pointe légèrement recourbée vers l’avant. Ses sections suivent la courbure pour
conserver une vraie épaisseur. Les UV et normales du verre miroir restent intacts.

[Comparaison du profil au schéma rouge](les-cyclopes/ear-route-compare.png) : recalage sur
41 repères d’anatomie inchangée, lunettes exclues ; erreur moyenne de recalage 1,36 px.
Aux quatre abscisses mesurées entre la monture et l’oreille, l’écart des bords est de 3,94 px
au maximum dans la capture d’origine ([mesures](les-cyclopes/ear-route-compare.json)).
Cette mesure locale ne constitue ni une validation du dos caché ni une acceptation de l’auteur.

## Source et matière

Concept ImageGen `ref/concept-v2.png` → Meshy 7.1 → retopologie Meshy : 40 crédits historiques
(35 + 5), source GLB de 4 034 triangles conservé et tâches dans `tasks.json`.
Les 1 038 triangles de miroir gardent leurs positions, UV et normales. La déformation est
limitée aux parties non métalliques du raccord latéral ; les points partagés avec le verre
sont protégés. Les nouvelles surfaces violettes et les branches réemploient l’atlas existant.
Aucune nouvelle génération payante pour ces retouches.

Un mesh et un matériau par corps, deux maps 2k partagées. Painted Toon conserve le reflet
de studio teinté dépendant de la vue, sans réflexion de scène ni transparence. Le dos et les
dimensions masqués sur les photos restent inférés des vrais meshes Quaternius ; corps inchangés.

## Contrôles et reproduction

Avec Blender headless et `--python-exit-code 1` :

1. `build/02_fit_and_export.py -- --output artifacts/les-cyclopes/fitted-v7` ;
2. `build/03_validate_fit.py -- --output artifacts/les-cyclopes/fitted-v7` ;
3. copier les FBX, BaseColor et MetalMask dans `Assets/Characters/LesCyclopes`, puis appeler
   `LesCyclopes.Build()` via Unity Pipeline. `QuaterniusPoc.Build()` inclut cet accessoire.

Le master Blender reste local. Le build contrôle que chaque arête de raccord possède une
face de monture et une face de branche. La relecture FBX refait cette vérification sur les
positions exportées : 30/29 et 32/29 arêtes continues, sans ouverture. Le même contrôle
rejette l’ancien export v5 à barre superposée. Le nouveau contrôle anatomique examine les
sections réimportées : départ sous le sommet de l’oreille, largeur décroissante vers l’appui,
retour descendant derrière l’oreille. L’export v6 à barre haute échoue à ce contrôle, alors
que ses arêtes étaient déjà soudées.

La relecture conserve les 54 rayons d’iris par corps, la distance iris/verre, zéro traversée
des oreilles/peau par les branches, et 36 rayons profil/trois-quarts avec la crête homme :
aucun cheveu devant les lunettes. Les 21 visages/nez et les bandeaux gardent le verre dégagé.
Unity valide aussi les 27 combinaisons coupe/coiffe, ordre d’équipement, rotation Head et
retrait indépendant. Les contacts latéraux sous laine/cheveux longs restent consignés dans
`fit-report.json`, aucun dans les 110 mm centraux de visière.

Rendus actuels à 360 × 360, proches de la taille de l’app :
[homme/profil](les-cyclopes/unity-fit-male-profile.png),
[homme/trois-quarts](les-cyclopes/unity-fit-male-threequarter.png),
[femme/coupe courte/profil](les-cyclopes/unity-fit-female-profile.png).
Le profil homme reprend la coupe coiffée et le nez large de la dernière capture de l’auteur.
Ces contrôles ne constituent pas une acceptation visuelle de sa part.

## Essai

GRRIND dev → Réglages → Atelier avatar 3D → Tester Les Cyclopes.
Lien : `grrindapp-dev://character-showcase?item=cyclopes`.
Visage puis Profil conserve le gros plan ; les angles sont indépendants du cadrage.
Livraison : tranche Unity Device puis app hôte sur Dyoxel selon `docs/ai/mobile-qa.md`.
Pas de build Simulator, Maestro ou EAS/TestFlight pour ce pilote visuel.
