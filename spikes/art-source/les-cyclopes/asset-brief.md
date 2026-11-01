# PR_LesCyclopes — essai atelier (#350)

ASSET PR_LesCyclopes, « Les Cyclopes », lunettes de cycliste facettées.
CATEGORY prop rigide attaché à Head, slot Accessoire indépendant de HEAD.
VIEWS ref/cycling-reference.png : forme enveloppante et couleurs funky, sans marque à reproduire.
ref/concept-v2.png : concept ImageGen utilisé pour Meshy, miroir rose/orange/or, cadre violet,
branches jaune citron. Perspective unique : courbure, arrière et dimensions restent inférés.
SCALE Mètres, Z haut et +Y avant dans Blender. Largeur 1,13 × tête réelle ; adaptation
uniforme par corps. Irréductible : couvrir les iris, pas seulement éviter la peau.
PARTS Écran monobloc courbe et opaque, encoche nasale, monture biseautée et branches sport.
Source Meshy texturée, un mesh et un matériau partagé, aucun personnage dans l’export.
MATERIALS Verre miroir dichroïque avec reflet de studio mobile dans le shader existant ;
monture mate violet/citron. Pas d’émissif, de transparence ni de réflexion temps réel de scène.
ARTICULATION Head suit les animations. Aucune suppression des cheveux/coiffes par les lunettes.
La Moumoutivation conserve son masquage existant des cheveux et du bandeau.
TARGET Unity 6000.3.26f1, FBX, ≤ 6 000 triangles par corps, un matériau opaque et deux maps 2k.
REVIEW Iris masqués de face et à ±25°, 21 combinaisons visage/nez sans verre dans la peau,
neuf coupes et deux coiffes compatibles. Reflet et raccords jugés sur le vrai iPhone.

## Production et livraison

ImageGen → Meshy 7.1 (35 crédits) → retopologie Meshy ciblant 4 000 triangles (5 crédits).
Source finale : 4 034 triangles, UV et topologie conservés dans Blender ; rotation, translation,
échelle uniforme et cintrage local des branches. Leurs normales suivent la déformation. Les deux coûts ont été annoncés dans le chat avant les appels.
Le MCP Blender ne répondait pas ; les scripts bpy s’exécutent dans Blender headless.

Pilote atelier/iPhone autorisé : pas de back, de prix ou de loot. La première version
procédurale a été rejetée ; le modèle Meshy et la couverture des vrais iris la remplacent.
Contrôles reproductibles dans les scripts, asset-manifest.json et fit-report.json ;
quelques rendus dans docs/design/les-cyclopes/. L’acceptation visuelle finale revient à l’auteur.

## Retour porté et retouche

La capture `ref/iphone-fit-feedback.jpg` confirme le rendu Meshy apprécié, mais des branches
qui traversent les oreilles et un verre trop avancé. Rapprochement de 16/18 mm homme/femme,
sans changement de hauteur ni de silhouette de la visière. Cintrage local des branches
au-dessus puis derrière les oreilles réelles, sans rallonger le retour arrière.
Cibles observables : distance iris/verre < 32 mm, zéro intersection des deux oreilles,
nez et bandeaux dégagés, contrôle de profil homme et femme coupe courte. Aucun nouvel appel payant.
