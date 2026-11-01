# Les Cyclopes — pilote iPhone (#350)

Accessoire de cyclisme cumulable avec HEAD : visière Meshy miroir rose/orange/or,
monture violette et branches citron. Atelier uniquement, sans tenue sauvegardée, catalogue
serveur ni loot. Le jugement du modèle porté revient à l’auteur sur son iPhone.

## Source et géométrie actuelle

Concept ImageGen `ref/concept-v2.png` → Meshy 7.1 → retopologie Meshy : 40 crédits historiques
(35 + 5), tâches et paramètres dans `tasks.json`, GLB original de 4 034 triangles conservé.
Les dimensions sont inférées des têtes Quaternius et des références en perspective.

Après les retours iPhone, les branches arrière sont remplacées par des tiges fines tracées
sur la tempe et le pli supérieur de l’oreille. La visière conserve ses 1 038 triangles de
miroir, leurs positions, UV et normales. La coupe arrière de la monture interpole les
attributs aux raccords et ferme les sections ; elle ne retouche pas le verre.

| Corps | Triangles livrés | Distance iris/verre | Branche | Petit retour |
| --- | --- | --- | --- | --- |
| Homme | 3 102 | 24,7–29,6 mm | 3,2 × 1,8 mm | descente 9 mm |
| Femme | 3 087 | 24,4–29,9 mm | 3,2 × 1,8 mm | descente 9 mm |

Un mesh, un matériau et deux maps 2k partagés. Les branches réemploient les teintes mates
citron/violet de l’atlas Meshy ; le retour est sombre et court. Painted Toon conserve le
reflet de studio teinté dépendant de la vue, sans réflexion de la scène ni transparence.
Aucun nouvel appel payant pour ces retouches.

## Référence de raccord et historique des retours

`ref/iphone-fit-feedback.jpg` : premier retour, branches dans les oreilles et verre trop
avancé. Le rapprochement de 16/18 mm homme/femme est conservé : davantage croisait certains
bandeaux. Le cintrage qui remontait les branches a ensuite été rejeté par l’auteur : arche
au-dessus des oreilles et long retour violet extérieur (`iphone-temple-arch-rejected.jpg`).

La reprise suit `ref/natural-temple-reference.jpg` : branche presque droite le long de la
tempe, petit retour discret près du pli de l’oreille. L’ancien cintrage est supprimé.
La forme de l’appui arrière reste inférée là où la photo la masque ; les deux profils
rapprochés documentent le résultat à juger sur téléphone :
[homme](les-cyclopes/unity-fit-male-profile.png),
[femme, coupe courte](les-cyclopes/unity-fit-female-profile.png).

## Contrôles et reproduction

Avec Blender headless et `--python-exit-code 1` :

1. `build/02_fit_and_export.py -- --output artifacts/les-cyclopes/fitted-v4` ;
2. `build/03_validate_fit.py -- --output artifacts/les-cyclopes/fitted-v4` ;
3. copier les FBX, BaseColor et MetalMask dans `Assets/Characters/LesCyclopes`, puis appeler
   `LesCyclopes.Build()` via Unity Pipeline. `QuaterniusPoc.Build()` inclut cet accessoire.

Le master Blender reste local. La relecture FBX vérifie 18 points d’iris par corps à
-25°/0°/+25° derrière le verre métallique, la distance iris/verre et zéro intersection des
branches avec les oreilles ou la peau de la tempe. Les 21 combinaisons visage/nez, neuf
coupes et leurs bandeaux gardent le verre dégagé.

Les contacts latéraux du verre sous la laine (74 homme, 79 femme) et les cheveux longs
(71 femme) restent consignés ; aucun dans les 110 mm centraux. Rendus actuels :
[homme/afro](les-cyclopes/unity-male-afro.png),
[homme/laine](les-cyclopes/unity-male-moumoutivation.png),
[femme/long/bandeau](les-cyclopes/unity-female-long-bandeau.png),
[femme/laine](les-cyclopes/unity-female-moumoutivation.png).

Unity refait les 54 rayons iris/verre par corps sur la géométrie effective et contrôle les
27 combinaisons coupe/coiffe, ordre d’équipement, rotation Head et retrait indépendant.
Ces mesures ne valent pas une acceptation visuelle par l’auteur.

## Essai

GRRIND dev → Réglages → Atelier avatar 3D → **Tester Les Cyclopes**.
Lien : `grrindapp-dev://character-showcase?item=cyclopes`.
Les commandes Face/Profil/Trois-quarts changent seulement l’angle. Le cadrage En pied/Visage/
Tissu est indépendant : **Visage puis Profil** conserve le gros plan, contrairement au
comportement rejeté dans `ref/iphone-profile-framing-rejected.jpg`.

Livraison : tranche Unity Device puis app hôte sur Dyoxel selon `docs/ai/mobile-qa.md`.
Pas de build Simulator, Maestro ni EAS/TestFlight pour ce pilote visuel.
