# Brief et références d’un item

Avant production, consigner dans `spikes/art-source/<objet>/asset-brief.md` :

- Nom, sport, gag visuel et famille d’objet ; concept approuvé et contraintes de silhouette.
- Livraison convenue : image, pilote d’atelier/iPhone ou catalogue jouable. Pour le catalogue,
  cadrer la clé, le slot, les corps compatibles, le serveur, l’inventaire et la persistance.
- Références visuelles et rôle de chacune : forme, style, proportion, matière ou contexte.
- Taille, ouverture/prise, os de rattachement, pièces masquées et retour attendu au retrait.
- Budget de géométrie/matériaux adapté à l’objet, coût annoncé avant chaque appel payant,
  faces ou dimensions inférées, et contrôle observable qui décidera de l’acceptation.

## Préparer la génération

Partir du concept approuvé pour dériver l’objet seul et les vues face/profil/dos utiles.
Chaque vue contient le même objet, au même état, sans personnage, sol ou accessoire parasite.
Contrôler ensemble proportions, oreilles/cornes, ouvertures, emplacement des matières et dos.
Une vue dérivée reste une hypothèse ; une perspective ne devient pas un plan coté.
Annoncer le rôle des références à chaque génération. Utiliser le skill `imagegen` pour le raster.

Vérifier la cohérence avant de lancer Meshy. Pour les formes comparables aux pilotes actuels,
le profil de départ est `meshy-7.1`, `geometry_resolution: 2k`, texture 2k et
`image_enhancement: false`, avec le budget fixé à la génération. Consulter le schéma de
l’outil et son tarif courant : les 35 crédits de la Moumoutivation sont un coût historique,
pas un prix garanti. Omettre `pose_mode` pour un objet porté rigide.

Réutiliser le mesh et l’ajustement pour une simple variante de couleur. Une nouvelle forme
peut exiger une génération ; une couleur seule n’en justifie pas une. Ne pas décimer ou
lisser un mesh déjà texturé pour rattraper un mauvais brief. Un prompt qui décrit une prise
ou un creux peut faire apparaître l’objet absent suggéré : nommer seulement les pièces voulues.

## Conserver ce qui permet de reprendre l’item

Dans le dossier de l’objet : concept et vues, prompts, source téléchargée, script/profil
d’ajustement et manifeste. `tasks.json` garde l’id, les paramètres et les crédits réellement
consommés ; `PROVENANCE.json` garde outil, licence et modifications. Aucun secret ou lien
de téléchargement signé à versionner. Les masters Blender restent locaux selon `.gitignore`.

Garder quelques rendus utiles avec les dimensions et écarts observés ; une campagne entière
de captures n’est pas une preuve permanente. Une mesure de silhouette demande des masques et
caméras comparables : une cavité illustrée blanche et une doublure 3D sombre ne se comparent
pas comme deux silhouettes pleines. Documenter toute normalisation et ses limites.
