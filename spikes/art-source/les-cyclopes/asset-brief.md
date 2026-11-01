# PR_LesCyclopes — essai atelier (#350)

ASSET Les Cyclopes, lunettes de cycliste facettées, prop rigide attaché à Head.
CATEGORY Accessoire indépendant de HEAD ; corps Quaternius homme/femme préservés.
VIEWS cycling-reference.png : forme enveloppante et couleurs funky, aucune marque à copier.
concept-v2.png : visière rose/orange/or et monture violet/citron générées avec ImageGen pour Meshy.
natural-temple-reference.jpg : raccord presque droit contre la tempe, retour court discret.
SCALE Mètres, Z haut et +Y avant dans Blender ; largeur initiale 1,13 × tête réelle.
PARTS Visière/monture Meshy conservées, branches arrière remplacées après rejet de l’arche.
SILHOUETTE Écran unique courbe, encoche nasale, tiges fines ; pas d’arche ni de longue pointe extérieure.
MATERIALS Verre miroir teinté avec reflet de studio mobile Painted Toon, monture/branches mates.
Palette citron/violet réemployée depuis l’atlas Meshy ; aucun émissif ni transparence.
ARTICULATION Head suit les animations sans masquer cheveux/coiffes. La Moumoutivation garde sa règle existante.
INFERRED Retour derrière l’oreille masqué sur la photo ; courbure et métrique dérivées des vrais meshes.
TARGET Unity 6000.3.26f1, FBX, un mesh/matériau, deux maps 2k ; 3 102/3 087 triangles homme/femme.
REVIEW Branche 3,2 × 1,8 mm le long de la tempe, descente arrière 9 mm, pas de traversée peau/oreilles.
Iris couverts à ±25°, nez/bandeaux dégagés et profil en gros plan sur iPhone.

## Production et périmètre

ImageGen → Meshy 7.1 (35 crédits) → retopologie Meshy (5 crédits), source GLB conservé.
Les 1 038 triangles de miroir gardent positions, UV et normales. Seuls les raccords arrière
sont coupés/fermés et les nouvelles branches tracées sur la peau, sans lissage du verre.
Aucune nouvelle génération pour le raccord. Blender MCP indisponible : scripts bpy headless.
Pilote atelier/iPhone seulement, sans back, prix, loot ou tenue sauvegardée.

## Retours portés

iphone-fit-feedback.jpg : rendu Meshy apprécié, verre éloigné et branches dans les oreilles.
Rapprochement de 16/18 mm conservé. L’essai de cintrage a été rejeté dans
iphone-temple-arch-rejected.jpg : arche haute et long retour extérieur. Ce cintrage est abandonné.
La nouvelle référence natural-temple-reference.jpg remplace cette interprétation du raccord.
iphone-profile-framing-rejected.jpg : le bouton Profil revenait au corps entier ; angle et
cadrage sont désormais indépendants pour le jugement. L’acceptation finale appartient à l’auteur.
