# Les Cyclopes — pilote iPhone (#350)

Lunettes de cycliste en **Accessoire**, cumulables avec HEAD. Le concept et les couleurs sont
approuvés : visière unique facettée rose/orange/doré, cadre violet, branches jaune citron.
Le modèle est construit directement dans Blender ; aucun crédit Meshy consommé.

## Production et dimensions

Source reproductible : `spikes/art-source/les-cyclopes/`, photo de référence conservée dans
`ref/`, brief, master Blender local, scripts et manifeste versionnés. La photo est une
référence de forme en perspective ; les dimensions métriques sont inférées et ajustées aux
vrais yeux/têtes Quaternius, pas mesurées comme sur un plan orthographique.

| Ajustement | Largeur de visière | Hauteur cible | Triangles | Matériaux |
| --- | --- | --- | --- | --- |
| Homme | 208,55 mm | 62,26 mm | 456 | 2 |
| Femme | 202,93 mm | 63,96 mm | 456 | 2 |

Palette sRGB 256 × 32 partagée, opaque et sans lumière précalculée. Painted Toon existant,
MatCap acier partiel sur la visière, aucun nouveau shader ni émissif. Les exports FBX
contiennent uniquement cadre et verre ; leur relecture contrôle géométrie, UV et normales.

Pour une première reconstruction du master, utiliser `init_master.py` du skill
`blender-image-to-3d` avec `--name PR_LesCyclopes --height 0.065` et la photo en `--ref-extra`.
Puis, avec Blender headless et `--python-exit-code 1` :

1. `02_model_and_fit.py -- --output artifacts/les-cyclopes/fitted` ;
2. `03_validate_fit.py -- --output artifacts/les-cyclopes/fitted` ;
3. copier les deux FBX et BaseColor dans `Assets/Characters/LesCyclopes`, puis `LesCyclopes.Build()`
   via Unity Pipeline. Le builder principal `QuaterniusPoc.Build()` inclut aussi cet accessoire.

## Contrôles

`fit-report.json` contrôle les vrais exports contre les surfaces de référence :

- Visière sans intersection avec les 12 combinaisons homme et 9 combinaisons femme de visage/nez.
- Aucune intersection dans la partie centrale de la visière avec les 9 coupes et les deux
  ajustements de la Moumoutivation ; aucune avec les bandeaux correspondants.
- Les ailes latérales passent sous la laine et les mèches longues : le rapport conserve les
  intersections brutes (homme/laine 31, femme/laine 37, femme/cheveux longs 8). Ce sont des
  contacts sur les extrémités couvertes, pas une prétendue absence de contact sur toute la pièce.

`LesCyclopes.Validate()` contrôle les 27 combinaisons coupe/coiffe des deux corps, les deux
ordres d’équipement, l’attache Head en rotation et le retrait indépendant. Il ne remplace pas
le contrôle visuel sur téléphone. Les coiffures restent affichées ; seule la Moumoutivation
les masque selon sa règle existante.

Rendus Unity utiles :
[homme/afro](les-cyclopes/unity-male-afro.png),
[homme/laine](les-cyclopes/unity-male-moumoutivation.png),
[femme/cheveux longs/bandeau](les-cyclopes/unity-female-long-bandeau.png),
[femme/laine](les-cyclopes/unity-female-moumoutivation.png).

## Essai de l’auteur

GRRIND dev → Réglages → Atelier avatar 3D → **Tester Les Cyclopes**.
Lien : `grrindapp-dev://character-showcase?item=cyclopes`.
L’onglet Accessoires permet de garder/retirer les lunettes, le bandeau ou la Moumoutivation.
Corps, Traits, Cheveux et Mouvements permettent de juger les raccords et le duel de démonstration.
L’essai ne modifie pas la tenue sauvegardée et ne publie aucun objet dans la boutique serveur.
Une nouvelle donnée Unity demande la tranche Device, puis l’app hôte du vrai iPhone selon
`docs/ai/mobile-qa.md`. Aucun EAS/TestFlight pour ce pilote.
