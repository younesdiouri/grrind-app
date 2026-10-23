# Gants de boxe dorés

23 octobre 2026. Pilote demandé après les Guinzz : une paire Meshy dorée portée par les avatars Quaternius existants. Atelier local et duel de démonstration ; aucun équipement serveur, backend ou EAS modifié.

Une référence ImageGen à trois vues a alimenté une seule tâche Meshy 7.1, géométrie 2K et texture 2K : `01a16814-afe5-7372-8cc8-0d0acb93157b`, **35 crédits consommés**. La source contient 1 852 triangles. Blender conserve sa topologie et ses UV, ajuste les proportions et la taille, puis produit les côtés gauche/droit pour les deux corps. La paire équipée représente 3 704 triangles avec une seule texture partagée. Longueur : 27 cm masculin, 25 cm féminin.

Le gant suit rigidement l’os de main. Les triangles cachés de la main sont retirés d’une copie des bras Fantasy et du corps Sport ; déséquiper restaure les meshes d’origine. Les quatre exports FBX sont réimportés dans des scènes vierges : nombres de triangles, UV et dimensions passent. Le validateur Blender ne signale aucune erreur ; ses avertissements de sommets coïncidents correspondent aux séparations de normales/UV de la source Meshy, préservées volontairement.

Un premier recalcul global des normales avait retourné des faces du miroir : rejeté. L’export final conserve l’ordre des faces et inverse uniquement le miroir. Les gros plans Unity finaux montrent un revers fermé autour du poignet, sans doigt exposé.

## Mesures et preuves

- 28 captures Unity : sept gestes au contact, de face et de trois quarts, sur les deux corps.
- 12 captures supplémentaires aux phases 0,25 et 0,75 : direct, uppercut et esquive sur les deux corps. Revue visuelle sans pénétration observée ; cet échantillonnage ne démontre pas toutes les transitions possibles.
- Comparaison de silhouette côté paume : source brute IoU 0,944 ; proportions ajustées IoU 0,953. Masque de référence extrait par séparation chromatique du fond gris ; rendu orthographique avec alpha. Mesure alignée sur les boîtes, donc pas une preuve d’échelle absolue.
- La référence créée n’est pas un plan industriel : largeur dorsale/hauteur ≈ 0,625, paume ≈ 0,648. Le mesh final suit la largeur dorsale. Écart maximal d’une bande côté paume : 0,059 de la hauteur (haut de la masse de frappe plus étroit). Cette différence reste documentée, sans revendiquer une reproduction exacte de toutes les vues.
- Dimensions de chaque export vérifiées à 0,1 mm près par `build/02_roundtrip.py` ; fichier `roundtrip.json`.
- Contrôle Unity `GoldenBoxingGloves.Validate()` : présence des deux gants, substitution des mains et restauration des meshes sur les deux corps, PASS.
- Typecheck, lint, 559 tests et 29 previews : PASS.
- Simulator : `.maestro/quaternius-poc.yaml`, session `2026-10-23_114321`, PASS en 2 min 46 s. Gros plans femme/homme, retrait, Fantasy, mouvements et duel inspectés. Export Unity Simulator, framework et host Debug réussis. UUID `ECEEA66B-FE35-38CA-9EAD-658C4275303C` et 16 fichiers Data identiques entre export et app installée. Empreinte du development build actualisée seulement après cette compilation et cette vérification, puis `e2e:ios:dev` a réutilisé le binaire.

Sources reproductibles : `spikes/art-source/golden-boxing-gloves/`. Assemblage : `GoldenBoxingGloves.Build()` ; également appelé lors de la reconstruction Quaternius complète. Provenance/licence dans `Assets/Characters/GoldenBoxingGloves/PROVENANCE.json`. Planches conservées dans `references/quaternius-poc/golden-gloves/` ; captures intermédiaires locales dans `artifacts/golden-gloves/`.

L’acceptation artistique reste celle de l’auteur. Les références générées et la revue technique ne constituent pas son verdict. iPhone physique non testé.
