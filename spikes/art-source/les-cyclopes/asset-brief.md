# PR_LesCyclopes — essai atelier (#350)

ASSET PR_LesCyclopes, « Les Cyclopes », lunettes de cycliste facettées.
CATEGORY prop, accessoire rigide attaché à Head ; indépendant de HEAD.
VIEWS ref/cycling-reference.png : photos de produits en perspective, visières larges et enveloppantes. Référence de forme uniquement, pas de marque ni de texte à reproduire. Palette et direction approuvées dans le chat : violet, jaune citron, miroir fuchsia/orange/doré.
SCALE Ajustement sur les vrais FBX FacetedFace homme/femme, en mètres, Z haut et +Y avant dans Blender. Largeur cible ≈ 1,15 × largeur de tête ; hauteur ≈ 0,28 × hauteur de tête. Aucune modification du corps.
PROPORTIONS Visière unique, largeur/hauteur indicative 3,2 ; verre ≈ 86 % de la hauteur totale ; cadre de 3 mm ; épaisseur verre 2 mm ; largeur nez ≈ 28 mm ; extrémités enveloppantes ; branches ≈ 110 mm, adaptées aux tempes ; yeux couverts, bouche et pointe du nez dégagées. Rapports de design inférés des photos en perspective, pas de plan orthographique.
PARTS Visière facettée fermée et opaque avec encoche nasale ; monture violette ; branches jaune citron avec extrémités violettes ; appuis nasaux sombres. Deux meshes/material slots au maximum à l’export, UV de palette partagée. Pas de personnage généré ni de lunettes peintes sur la peau.
SILHOUETTE Grand écran monobloc anguleux, arc enveloppant, encoche nasale nette, branches sport épaisses.
MATERIALS Cadre polymère mat violet/citron ; visière miroir fuchsia-orange-or à facettes et reflets sobres du shader Painted Toon existant. Aucun émissif ni transparence/surfaces superposées coûteuses. Palette sans lumière précalculée.
ARTICULATION Head, suit les mouvements existants ; ne masque pas les cheveux et ne déséquipe aucune coiffe. La Moumoutivation garde sa règle existante de masquage cheveux/bandeau.
INFERRED Profondeur, courbure, dessous et arrière des branches ; tailles métriques dérivées des têtes Quaternius et de leur position des yeux. Les branches passent sous les mèches/coiffes comme de vraies lunettes ; les contacts cachés sont distingués des traversées visibles de la visière.
TARGET Unity 6000.3.26f1, FBX, ≤ 1 500 triangles par variante et deux matériaux partagés, visière opaque. Atelier et duel de démonstration sur iPhone ; contrôle proche du visage et au cadrage combat.

## Livraison et contrôle

Pilote atelier/iPhone autorisé : nom, forme, couleurs et slot Accessoire approuvés par l’auteur.
Deux ajustements à partir des têtes réelles ; contrôles des formes de visage/nez, neuf coupes
compatibles et deux coiffes actuelles. Export et relecture propres ; mesures des intersections
de la visière et validation Unity de l’attache, du cumul, du changement de coupe et du retrait.
Quelques rendus utiles, pas une campagne de captures. Le jugement visuel final appartient à
l’auteur sur son iPhone. Pas de back, de loot ou de prix dans cet essai.

Production directe Blender : forme géométrique et ajustement reproductible ; aucun appel Meshy
payant. Le MCP Blender n’est pas connecté ; exécution headless des scripts versionnés.
