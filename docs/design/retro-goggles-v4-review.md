# Lunettes : corriger l’occultation

L’auteur a repéré sur la preuve Muscu un défaut manqué dans la revue V3 : l’arceau
arrière se dessinait sur le front et la branche éloignée dépassait du côté du nez.
Le placement des verres ne suffisait pas à valider l’objet porté.

Le nouveau calque omet ces surfaces cachées. Il garde les deux verres ambrés, le pont
et l’ailette dorée de la branche proche. Le miroir porte cette même branche du bon côté.
Il n’ajoute ni masque peint sur le corps ni nouvelle couche à calculer : un seul PNG porté
par orientation. Les avatars et leurs sept stances restent identiques.

Première passe : quatre planches individuelles, chaque pose entière suivie du visage agrandi,
dans les deux sens. Vérifications : air transparent au-dessus des montures, absence de branche
derrière le petit verre, branche proche reliée à la monture au niveau de la tempe,
pont devant le nez, verres devant les yeux, cheveux et contour du front dégagés.

Deuxième passe et rendu intégré : voir les preuves finales et le résultat du contrôle natif
ci-dessous. Les vues de trois quarts restent stylisées ; cette correction ne permet pas une
rotation libre de la tête. Les nouvelles perspectives devront recevoir leur propre calque.

- [56 gros plans finaux](proofs/retro-goggles-v4-pursuit_goggles-contacts-0.png) : quatre avatars,
  sept poses, deux sens ; aucune boucle arrière ni ailette du côté éloigné.
- [Muscu : vues entières et détails](proofs/retro-goggles-v4-pursuit_goggles-strength_v3-details.png).
- [Tenues cumulées finales](proofs/retro-goggles-v4-all.png) avec arme, palmes et cape.
- [Vrai rendu de l’inspecteur admin local](proofs/retro-goggles-v4-admin.jpg), Muscu en garde.

Le contrôle navigateur montre le nouveau sprite réellement servi par le catalogue local.
Le rôle temporaire du compte QA a été retiré et l’onglet de contrôle fermé après capture.

Le flow natif existant `.maestro/appearances.yaml` passe en 3 min 26 s, sur le development
build installé avec Metro 8082. Les captures montrent les quatre identités équipées et leur
bouton sélectionné, les sept stances dans les deux sens puis le combat et le retour portrait.
Preuves conservées : [Muscu](proofs/retro-goggles-v4-native-muscu.png),
[Escalade](proofs/retro-goggles-v4-native-climber.png),
[critique Natation en miroir](proofs/retro-goggles-v4-native-critical-mirror.png).
Le front dégagé et l’absence de branche éloignée sont visibles dans ces captures.

Typecheck, lint et 556 tests client passent. Backend : `make qa` et 1 450 tests / 31 617
assertions passent ; le catalogue sert la nouvelle version sélectionnable et les anciennes
versions pour les replays. OpenAPI inchangé. Pas de rebuild ni de déploiement. Le rendu sur
l’iPhone physique reste à essayer par l’auteur.

[Prompt, références et provenance imagegen](references/retro-goggles-v4-generation.json).
Les exports de l’outil intégré sont dans ../grrind/public/artwork/items/goggles/v4/ ;
alpha, recadrage et miroir sont exportés mécaniquement par le script existant.

Les lunettes reçoivent la version d’équipement V4 et de nouveaux chemins. Les profils restent
V3 et les anciens snapshots peuvent toujours résoudre leurs versions archivées. L’import
courant contient les lunettes V4 ; les migrations V3 et leur manifeste figé restent intacts.
