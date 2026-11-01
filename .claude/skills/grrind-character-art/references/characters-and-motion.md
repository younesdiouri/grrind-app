# Corps, mobs et mouvements

Le combat PvE/PvP est rendu dans Unity ; React Native garde les écrans et le HUD fixe.
Le serveur arbitre les résultats. Les scripts de rendu ne recalculent pas les règles de jeu.

Les corps humains restent les Quaternius pré-riggés déjà intégrés. Ne pas réintroduire les
anciens essais Muscu, Synty ou corps humains Meshy. Le workflow `blender-image-to-3d` sert aux
nouvelles formes/rigs qui le nécessitent ; les contrôles suivent le changement et `AGENTS.md`.

## Génération et rig

- Un générateur reprend le style de son entrée : préparer une référence dans la DA actuelle
  avant la génération. Un shader ne corrige pas un mauvais style ou de mauvaises proportions.
- Mesurer dimensions et proportions sur l’entrée et le mesh avec des caméras comparables.
  Une dérive historique de 3,3 à 4 têtes avait échappé au contrôle à l’œil (#219).
- Les multi-vues limitent les côtés inventés ; noter ceux qui restent inférés.
- Vérifier la présence réelle des os de doigts dans le rig livré. Les anciens rigs Meshy
  n’en avaient pas : des poings déjà fermés étaient nécessaires. Ne pas supposer que tous
  les fournisseurs ou versions de rigs ont cette même limite.
- Un clip fait pour un squelette s’importe en Generic sur ce squelette. Les clips Mixamo
  retargetés sur les humains utilisent le Humanoid existant. Documenter les axes, la racine
  du mouvement et les contacts ; conserver les déplacements de l’arène sous son contrôle.

## Chronologie

`UNITY_POSES` dans `src/features/combat/unityFrame.ts` indexe garde 0, attaque 1, coup reçu 2,
critique 3, esquive 4, combo 5, relance 6. **La phase 0,5 est le contact** ; les contacts mesurés
des clips se trouvent dans `FighterPose.contacts`. Vérifier les gestes modifiés dans les deux
orientations et au vrai cadrage. Un geste illisible en silhouette se corrige dans l’animation.

Produire un premier pilote et recueillir le jugement de l’auteur avant une série. Conserver
son retour avec l’objet et les mouvements concernés, sans l’étendre aux variantes non vues.
