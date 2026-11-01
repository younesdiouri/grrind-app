# PR_LesCyclopes — essai atelier (#350)

ASSET Les Cyclopes, lunettes de cycliste facettées, accessoire rigide attaché à Head.
CATEGORY Accessoire indépendant de HEAD, deux corps Quaternius inchangés.
VIEWS concept-v2.png et cycling-reference.png : forme/palette de visière miroir générée pour Meshy.
ear-route-author-sketch.jpg est la référence actuelle du profil et du passage derrière l’oreille.
continuous-frame-reference.webp guide le raccord continu de la monture. Aucune marque reproduite.
SCALE Mètres, Z haut et +Y avant dans Blender ; rapprochement de 16/18 mm homme/femme conservé.
PARTS Verre Meshy préservé ; côté violet reformé vers sa section arrière, arêtes partagées avec
la branche. Aucun raccord par bouchon plus chevauchement de deux volumes.
SILHOUETTE Écran unique, encoche nasale ; départ bas et large dans le côté violet, amincissement
vers l’oreille puis retour descendant derrière. Supprimer la silhouette de barre haute uniforme.
PROPORTIONS Départ haut de 18 mm, centre 11,2/13 mm sous le sommet de l’oreille ; appui de 6 mm,
épaisseur de 4 mm ; retour jusqu’à environ 21 mm sous le sommet de l’oreille, pointe vers l’avant.
MATERIALS Miroir Painted Toon existant ; même violet de la monture à la branche, citron extérieur
seulement après le raccord. Un mesh/matériau, deux maps 2k, sans émissif ni transparence.
ARTICULATION Head, sans déséquiper cheveux/coiffes. Moumoutivation garde son masquage existant.
INFERRED Dos et métrique des parties cachées sur la photo, dérivés des vrais meshes.
TARGET Unity 6000.3.26f1, FBX : 3 381 triangles homme, 3 387 femme, essai sur le vrai iPhone.
REVIEW Profil comparé au tracé rouge après recalage de l’anatomie, puis trois-quarts ;
verre inchangé, oreilles/peau/nez et bandeaux dégagés ; coiffure coiffée et crête homme.

## Source et retour porté

ImageGen → Meshy 7.1 (35 crédits) → retopologie Meshy (5 crédits), GLB source conservé.
Les 1 038 triangles de miroir gardent positions, UV et normales. Les sommets partagés avec
le verre sont protégés lors de la déformation du côté violet. Aucun nouvel appel payant.
Le retour iphone-top-bar-rejected.jpg apprécie les branches mais rejette leur superposition
au-dessus du cadre. Le chevauchement d’une pièce ajoutée ne suffit pas à la continuité de forme :
il est remplacé par un raccord à arêtes communes, vérifié après réimport des FBX. Ce raccord
soudé v6 restait trop haut : le schéma rouge le remplace par une aile basse, effilée vers
l’oreille, puis un coude derrière. Les sections du coude suivent sa tangente. Le contrôle
anatomique réimporté rejette v6 ; la comparaison mesurée du profil est dans la documentation.
Blender MCP indisponible : scripts bpy headless reproductibles. Atelier uniquement, sans
back, prix, loot ou tenue sauvegardée. L’auteur juge l’acceptation finale sur son iPhone.
