# PR_LesCyclopes — essai atelier (#350)

ASSET Les Cyclopes, lunettes de cycliste facettées, prop rigide attaché à Head.
CATEGORY Accessoire indépendant de HEAD ; corps Quaternius homme/femme préservés.
VIEWS cycling-reference.png et concept-v2.png : visière enveloppante miroir rose/orange/or,
monture violet/citron, source ImageGen/Meshy. cycling-sport-stem-reference.jpg est la référence
actuelle des branches : épaisses, raccord plein et ligne droite en profil. Aucune marque copiée.
SCALE Mètres, Z haut et +Y avant dans Blender ; visière rapprochée de 16/18 mm homme/femme.
PROPORTIONS Branche 8 × 4 mm, environ 11 % de la hauteur du verre ; partie visible à hauteur
constante du raccord à l’oreille. Jonction élargie sur le bord supérieur, retour descendant de 15 mm.
PARTS Visière Meshy conservée ; raccords arrière fermés et branches sport reconstruites.
SILHOUETTE Écran unique courbe, encoche nasale, branches robustes continues sans forme en accent.
MATERIALS Miroir teinté Painted Toon existant ; polymère mat violet avec face extérieure citron.
Un mesh/matériau, deux maps 2k existantes, aucun émissif ni transparence.
ARTICULATION Head suit les animations sans déséquiper de coiffe. Moumoutivation garde son masquage cheveux/bandeau.
INFERRED Dos et retour masqués sur la photo, métrique des têtes réelles. Aucun changement des corps.
TARGET Unity 6000.3.26f1, FBX : 2 910 triangles homme, 2 831 femme. Essai sur le vrai iPhone.
REVIEW Profil et trois-quarts avec la crête montrée par l’auteur, à la taille de l’app :
jonction visible et continue, épaisseur suffisante, aucune montée du corps de branche.
Recouvrement géométrique monture/jonction, absence de traversée peau/oreilles, iris et bandeaux dégagés.

## Source et retours

ImageGen → Meshy 7.1 (35 crédits) → retopologie Meshy (5 crédits), source GLB conservé.
Les 1 038 triangles du miroir gardent positions, UV et normales ; aucune nouvelle génération.
Le rapprochement de la visière est conservé. Après rejet de l’arche, les tiges fines ont aussi
été rejetées : raccord caché par les cheveux, épaisseur trop faible, départ montant.
iphone-disconnected-stems-rejected.jpg et iphone-rising-stems-rejected.jpg gardent ce retour.
Le tracé contre le crâne est abandonné pour la partie visible : corps droit plus extérieur,
jonction au bord supérieur plutôt qu’à l’ancienne charnière basse, retour seul près du crâne.
Blender MCP indisponible : ajustement reproductible bpy headless. Atelier uniquement,
sans back, prix, loot ou tenue sauvegardée. L’auteur juge l’acceptation visuelle sur iPhone.
