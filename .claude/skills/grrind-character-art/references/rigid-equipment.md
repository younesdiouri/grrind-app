# Coiffes et accessoires rigides

## Réemploi

Pour une coiffe enveloppante comparable, partir du
[pilote Moumoutivation](../../../../docs/design/moumoutivation.md) : vrais corps homme/femme,
attache Humanoid Head, matériau Painted Toon, masquage des cheveux/bandeau et restitution.
Le source, le profil `headwear-fit.json` et le wrapper d’export sont dans
`spikes/art-source/moumoutivation/`. Le script commun est
[`fit_rigid_headwear.py`](../scripts/fit_rigid_headwear.py).

Le profil est un point de départ pour cette silhouette, pas un ajustement universel des
bandeaux, lunettes et casques ouverts. Les autres accessoires utilisent leur vrai os et
leur zone de contact ; ne pas les ajuster avec les dimensions d’une coiffe entière.

## Ajuster une coiffe

Mesurer les têtes réelles à partir des FBX de visage courants ; ne pas changer l’échelle du
corps. Le script commun produit les deux ajustements en conservant topologie et UV :

```sh
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python .claude/skills/grrind-character-art/scripts/fit_rigid_headwear.py -- \
  --asset spikes/art-source/<objet> --output artifacts/<objet>/fitted
```

Renseigner `headwear-fit.json` avec le nom d’asset, le sens avant du source (`-Y` ou `+Y`),
les rapports de taille et les marges inférées. Les FBX Quaternius de visage utilisés ici
font face à **+Y dans Blender**. Vérifier la face au premier import ; la rotation de 180°
de la Moumoutivation ne s’applique que parce que son source Meshy faisait face à −Y.

Le script fonctionne en Blender headless ; il ne doit pas vider une scène utilisateur.
Vérifier le résultat hors `Assets/` avant d’exporter dans le dossier Unity de l’item.
Une mise à l’échelle affine règle le volume ; elle ne corrige pas une ouverture mal construite.

Après modification du script commun, vérifier le réemploi contre les deux FBX livrés,
sans réécrire les assets actifs :

```sh
rtk proxy /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python-exit-code 1 --python .claude/skills/grrind-character-art/scripts/test_rigid_headwear.py
```

## Contrôles et intégration

- Silhouette et dimensions sur chaque corps prévu ; visage/yeux/nez dégagés pour une coiffe
  ouverte. Contrôler aussi profil et nuque si leur construction le demande.
- Parentage au vrai os, pas de flottement ; vérifier le mouvement qui peut toucher le col,
  les épaules ou les mains. Les collisions d’un gros objet demandent une vérification ciblée.
- Masquer les coiffures/bandeaux incompatibles pendant le port, puis rétablir le choix au
  retrait. Changer de coiffure sous la coiffe ne doit pas la faire traverser.
- Reprendre les méthodes de `QuaterniusAppearance`, `BattleBridge` et le builder du pilote ;
  ajouter l’item au builder reproductible et à ses validations sans changer le modèle serveur
  si le périmètre est un essai local.
- Installer et ouvrir l’item présélectionné sur l’iPhone. Examiner son rendu à la taille du
  combat et en gros plan ; le réglage approuvé d’une coiffe ne valide pas toutes les suivantes.
