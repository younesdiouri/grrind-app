# Les Cyclopes — pilote iPhone (#350)

Lunettes de cycliste en **Accessoire**, cumulables avec HEAD : miroir rose/orange/doré,
cadre violet et branches citron. Concept ImageGen conservé dans `ref/concept-v2.png`, puis
reconstruction Meshy 7.1 et retopologie Meshy. Coût réel : **40 crédits** (35 + 5), tâches
et paramètres dans `spikes/art-source/les-cyclopes/tasks.json`.

## Production

Le GLB retopologisé est la source versionnée. Blender conserve sa topologie, ses UV et ses
normales ; seuls une rotation, une échelle uniforme et un déplacement adaptent chaque corps.
Aucun mannequin n’est livré avec les FBX. Les dimensions sont inférées des têtes Quaternius,
pas mesurées sur la photo de cyclisme en perspective.

| Corps | Largeur totale | Hauteur totale | Triangles | Mesh / matériau |
| --- | --- | --- | --- | --- |
| Homme | 204,92 mm | 70,84 mm | 4 034 | 1 / 1 |
| Femme | 199,40 mm | 68,94 mm | 4 034 | 1 / 1 |

Base couleur et masque métallique 2k partagés. Painted Toon réutilise le MatCap acier avec
une option de teinte miroir : les reflets clairs suivent la vue, le masque laisse la monture
mate. Ce reflet de studio est stylisé ; il ne reflète pas la scène environnante. L’option
vaut zéro sur les autres matériaux et conserve leur rendu existant. Verre opaque, sans
émissif ni transparence.

Reproduction avec Blender headless et `--python-exit-code 1` :

1. `build/02_fit_and_export.py -- --output artifacts/les-cyclopes/fitted-v2` ;
2. `build/03_validate_fit.py -- --output artifacts/les-cyclopes/fitted-v2` ;
3. copier les FBX, BaseColor et MetalMask dans `Assets/Characters/LesCyclopes`, puis appeler
   `LesCyclopes.Build()` via Unity Pipeline. `QuaterniusPoc.Build()` inclut cet accessoire.

Le master Blender reste local. La première géométrie procédurale a été remplacée après
rejet visuel de l’auteur ; les rendus ci-dessous représentent la version Meshy.

## Contrôles

`fit-report.json` contrôle les FBX réimportés : 18 points réels d’iris par corps, vus à -25°,
0° et +25°, tous derrière le verre métallique ; aucune intersection du verre avec les
21 combinaisons de visage/nez, les neuf coupes ou leurs bandeaux.

Les ailes latérales passent sous la laine : 8 contacts de triangles côté homme et 9 côté
femme, aucun dans les 110 mm centraux de la visière. Les rendus vérifient que ces raccords
restent couverts par la coiffe.

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
