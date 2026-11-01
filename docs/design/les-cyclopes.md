# Les Cyclopes — pilote iPhone (#350)

Lunettes de cyclisme en Accessoire, cumulables avec HEAD : visière Meshy miroir rose/orange/or,
monture violette et branches sport violet/citron. Essai atelier uniquement, sans catalogue
serveur, loot ni tenue sauvegardée. L’auteur juge le modèle porté sur son iPhone.

## Forme actuelle

La référence de raccord est `ref/cycling-sport-stem-reference.jpg` : branche large, clairement
reliée à la monture, droite jusqu’à l’oreille. Les anciennes tiges fines étaient trop petites,
masquées par les cheveux à leur départ et inclinées vers le haut ; elles sont remplacées.
Les captures `iphone-disconnected-stems-rejected.jpg` et `iphone-rising-stems-rejected.jpg`
conservent ces défauts à éviter. La partie visible suit désormais une ligne horizontale ;
seul le retour arrière descend, près du crâne.

| Corps | Triangles livrés | Distance iris/verre | Branche visible | Retour arrière |
| --- | --- | --- | --- | --- |
| Homme | 2 910 | 24,7–29,6 mm | 8 × 4 mm | descente 15 mm |
| Femme | 2 831 | 24,4–29,9 mm | 8 × 4 mm | descente 15 mm |

La section représente environ 11 % de la hauteur de visière. La jonction large s’ancre sur
le bord supérieur de la monture, avec un recouvrement réel (13/14 contacts de triangles
homme, 24/30 femme). Le bord supérieur reste à la même hauteur de la jonction jusqu’à
l’oreille : aucun départ oblique vers le haut. La branche visible passe à l’extérieur des
cheveux de la crête, au lieu de disparaître puis de ressortir en morceaux. La couleur mate
citron longe la face extérieure ; le corps et le retour sont violets.

## Source et matière

Concept ImageGen `ref/concept-v2.png` → Meshy 7.1 → retopologie Meshy : 40 crédits historiques
(35 + 5), tâches/paramètres dans `tasks.json`, source GLB de 4 034 triangles conservé.
La visière garde ses 1 038 triangles de miroir, leurs positions, UV et normales. Seuls les
raccords arrière de monture sont coupés/fermés et les branches remplacées dans Blender.
Aucune nouvelle génération payante pour ces retouches.

Un mesh et un matériau par corps, deux maps 2k partagées. Les branches réemploient les régions
mates violet/citron de l’atlas. Painted Toon conserve le miroir teinté dépendant de la vue :
reflet de studio stylisé, sans réflexion de scène ni transparence. Dimensions et dos masqué
sur la photo restent inférés d’après les vrais meshes Quaternius ; les corps ne changent pas.

## Contrôles et reproduction

Avec Blender headless et `--python-exit-code 1` :

1. `build/02_fit_and_export.py -- --output artifacts/les-cyclopes/fitted-v5` ;
2. `build/03_validate_fit.py -- --output artifacts/les-cyclopes/fitted-v5` ;
3. copier les FBX, BaseColor et MetalMask dans `Assets/Characters/LesCyclopes`, puis appeler
   `LesCyclopes.Build()` via Unity Pipeline. `QuaterniusPoc.Build()` inclut cet accessoire.

Le master Blender reste local. Le build contrôle le recouvrement jonction/monture et la
hauteur constante des quatre points de la partie droite. La relecture FBX mesure la distance
iris/verre, les 54 rayons d’iris par corps et zéro traversée des oreilles/peau par les branches.
Un contrôle dédié à la crête homme teste 36 rayons de visibilité de la jonction et du corps
de branche, de profil et trois-quarts sur les deux côtés : aucun cheveu devant les lunettes.
Les 21 combinaisons visage/nez, les neuf coupes et leurs bandeaux gardent le verre dégagé.

Unity refait la couverture des iris et les 27 combinaisons coupe/coiffe, l’ordre d’équipement,
la rotation Head et le retrait indépendant. Les contacts latéraux sous laine/cheveux longs
restent consignés dans `fit-report.json`, aucun dans les 110 mm centraux de visière.

Rendus actuels à 360 × 360, proches de la taille montrée sur le téléphone :
[crête homme/profil](les-cyclopes/unity-fit-male-profile.png),
[crête homme/trois-quarts](les-cyclopes/unity-fit-male-threequarter.png),
[femme/coupe courte/profil](les-cyclopes/unity-fit-female-profile.png),
[homme/afro](les-cyclopes/unity-male-afro.png),
[homme/laine](les-cyclopes/unity-male-moumoutivation.png),
[femme/long/bandeau](les-cyclopes/unity-female-long-bandeau.png),
[femme/laine](les-cyclopes/unity-female-moumoutivation.png).
Le profil et le trois-quarts homme reprennent la crête, le nez large et la tenue de la capture
de l’auteur. Les mesures et rendus ne constituent pas une acceptation visuelle de sa part.

## Essai

GRRIND dev → Réglages → Atelier avatar 3D → Tester Les Cyclopes.
Lien : `grrindapp-dev://character-showcase?item=cyclopes`.
Visage puis Profil conserve le gros plan ; Face/Profil/Trois-quarts changent uniquement
l’angle, indépendamment du cadrage En pied/Visage/Tissu.

Livraison : tranche Unity Device puis app hôte sur Dyoxel selon `docs/ai/mobile-qa.md`.
Pas de build Simulator, Maestro ou EAS/TestFlight pour ce pilote visuel.
