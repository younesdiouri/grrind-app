# Les Cyclopes — pilote iPhone (#350)

Lunettes de cycliste en **Accessoire**, cumulables avec HEAD : miroir rose/orange/doré,
cadre violet et branches citron. Concept ImageGen conservé dans `ref/concept-v2.png`, puis
reconstruction Meshy 7.1 et retopologie Meshy. Coût réel : **40 crédits** (35 + 5), tâches
et paramètres dans `spikes/art-source/les-cyclopes/tasks.json`.

## Production

Le GLB retopologisé est la source versionnée. Blender conserve sa topologie et ses UV. Rotation, échelle uniforme et déplacement adaptent
chaque corps ; les branches sont cintrées sur les sommets des vraies oreilles. Les normales
de la visière sont conservées, celles des branches suivent la déformation.
Aucun mannequin n’est livré avec les FBX. Les dimensions sont inférées des têtes Quaternius,
pas mesurées sur la photo de cyclisme en perspective.

| Corps | Largeur totale | Hauteur totale | Triangles | Mesh / matériau |
| --- | --- | --- | --- | --- |
| Homme | 204,70 mm | 71,94 mm | 4 034 | 1 / 1 |
| Femme | 199,14 mm | 68,94 mm | 4 034 | 1 / 1 |

Base couleur et masque métallique 2k partagés. Painted Toon réutilise le MatCap acier avec
une option de teinte miroir : les reflets clairs suivent la vue, le masque laisse la monture
mate. Ce reflet de studio est stylisé ; il ne reflète pas la scène environnante. L’option
vaut zéro sur les autres matériaux et conserve leur rendu existant. Verre opaque, sans
émissif ni transparence.

Reproduction avec Blender headless et `--python-exit-code 1` :

1. `build/02_fit_and_export.py -- --output artifacts/les-cyclopes/fitted-v3` ;
2. `build/03_validate_fit.py -- --output artifacts/les-cyclopes/fitted-v3` ;
3. copier les FBX, BaseColor et MetalMask dans `Assets/Characters/LesCyclopes`, puis appeler
   `LesCyclopes.Build()` via Unity Pipeline. `QuaterniusPoc.Build()` inclut cet accessoire.

Le master Blender reste local. La première géométrie procédurale a été remplacée après
rejet visuel de l’auteur ; les rendus ci-dessous représentent la version Meshy.

## Contrôles

`fit-report.json` contrôle les FBX réimportés : 18 points réels d’iris par corps, vus à -25°,
0° et +25°, tous derrière le verre métallique ; aucune intersection du verre avec les
21 combinaisons de visage/nez, les neuf coupes ou leurs bandeaux.

Les ailes latérales passent sous la laine (74 contacts de triangles homme, 79 femme) et
les mèches longues (71 contacts femme), aucun dans les 110 mm centraux de la visière.
Les rendus vérifient que ces raccords restent couverts par la coiffe.

`LesCyclopes.Validate()` refait les 54 rayons iris/verre par corps sur les géométries
effectives Unity et leur masque métallique. Il contrôle les 27 combinaisons coupe/coiffe,
les deux ordres d’équipement, la rotation Head et le retrait indépendant. Les cheveux
restent affichés ; seule la Moumoutivation applique sa règle existante de masquage.

Rendus Unity à 640 × 640 :
[homme/afro](les-cyclopes/unity-male-afro.png),
[homme/laine](les-cyclopes/unity-male-moumoutivation.png),
[femme/cheveux longs/bandeau](les-cyclopes/unity-female-long-bandeau.png),
[femme/laine](les-cyclopes/unity-female-moumoutivation.png).
Ils vérifient le placement et le reflet ; le jugement final appartient à l’auteur sur iPhone.

## Essai

GRRIND dev → Réglages → Atelier avatar 3D → **Tester Les Cyclopes**.
Lien : `grrindapp-dev://character-showcase?item=cyclopes`.
L’onglet Accessoires conserve/retire les lunettes, le bandeau ou la Moumoutivation.
Corps, Traits, Cheveux et Mouvements permettent de tester les raccords et le duel.
Cet essai ne modifie pas la tenue sauvegardée et ne publie pas d’objet côté serveur.

Livraison : tranche Unity Device, puis hôte GRRIND dev sur le vrai iPhone selon
`docs/ai/mobile-qa.md`. Pas de build Simulator, Maestro ni EAS/TestFlight pour ce pilote visuel.

## Retouche après essai iPhone

L’auteur apprécie le rendu Meshy mais signale des branches devant les oreilles et un verre
décollé du visage (`ref/iphone-fit-feedback.jpg`). La visière avance vers le visage de
16 mm côté homme et 18 mm côté femme : distance iris/verre mesurée de 24,7–29,6 mm et
24,4–29,9 mm, contre respectivement 40,7–45,6 et 42,4–47,9 mm avant retouche.
Ces décalages gardent les nez et tous les bandeaux dégagés ; avancer davantage croisait
le bandeau afro homme ou le bandeau cheveux longs femme.

Les branches se resserrent et remontent progressivement sur le haut des oreilles, avec
2 mm de marge au point d’appui, puis redescendent derrière. Le retour conserve sa position
arrière initiale pour éviter un dépassement après rapprochement du verre. Topologie,
UV, textures et matériau Meshy restent identiques. La déformation transforme les normales
par l’inverse-transposée du Jacobien local ; aucun lissage ni nouvelle génération.

Le validateur de relecture mesure la distance iris/verre et vérifie la région des deux
oreilles sur le vrai mesh de peau : zéro intersection, deux corps. Il conserve les
contrôles des iris, des 21 visages/nez, des coupes et des bandeaux.
Profils corrigés : [homme](les-cyclopes/unity-fit-male-profile.png),
[femme, coupe courte](les-cyclopes/unity-fit-female-profile.png).
