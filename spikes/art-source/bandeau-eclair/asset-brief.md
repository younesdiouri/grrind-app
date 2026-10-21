# Bandeau éclair — premier équipement #231

Une boucle textile bleu nuit, bordures cyan et éclair frontal, portée sur le front.
Référence ImageGen : `reference.png`. Géométrie et texture : Meshy 7.1, tâche
`01a15fb3-a126-77a8-be26-d9c0d4d45624`, 35 crédits consommés, 21 octobre 2026.
Requête originale : `request.json`. Conserver `source.glb` sans retopologie après texture.

Cible : iOS, Unity 6000.3, shader toon existant, un matériau opaque, 1 542 triangles.
Attache rigide au vrai os Head des deux Quaternius. Aucun corps généré.
Hauteur portée 45 mm ; largeur/profondeur adaptées à la surface réelle du crâne dans Blender,
avec 2 mm de jeu intérieur et environ 7 mm de tissu. Ces dimensions et le dos sont inférés
pour l'usage porté : la référence trois-quarts n'est pas un plan métrique.

Validation : intérieur ouvert, silhouette/badge conservés, échelle appliquée,
texture sRGB 2k ; import Unity, gros plan des deux têtes et duel animé au format du joueur.
Premier exemplaire uniquement, validation humaine avant série.

Reproduction : exécuter `build/01_fit_and_export.py` dans Blender via le MCP.
Le master `.blend` est local ; le GLB source, la texture, le script et les FBX sont conservés.
