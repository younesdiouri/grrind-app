# Gants de boxe dorés — pilote

ASSET PR_GoldenBoxingGloves
CATEGORY prop, paire rigide portée aux mains
VIEWS ref/three-views.png : dos de main, profil pouce, paume ; recadrages séparés envoyés à Meshy. Référence ImageGen créée pour ce pilote, pas encore approuvée par l’auteur.
SCALE mètres Quaternius natifs ; gant cible autour de 0,27 m de long, ajusté au poignet réel de chaque corps.
PROPORTIONS référence 1536×1024 : hauteur environ 720 px, largeur dorsale 450 px, profil 340 px, revers 250 px ; largeur/hauteur 0,625, profondeur/hauteur 0,472, revers/hauteur 0,347. Dimensions et géométrie réelle à consigner au contrôle du mesh.
PARTS un gant Meshy, miroir géométrique pour la main opposée, fixation rigide sur hand_l/hand_r. Les surfaces de main cachées sont retirées d’une copie du mesh des bras, réversible à la déséquipement.
SILHOUETTE masse de frappe arrondie, pouce replié distinct, large manchette courte, aucune main exposée.
MATERIALS cuir doré jaune/ocre, bordure anthracite, grandes plages simples, sans logo ni microtexture.
ARTICULATION squelette Quaternius existant, sept gestes de combat, aucune nouvelle animation.
INFERRED profondeur et dessous de manchette ; dimensions physiques ; symétrie gauche/droite ; ajustement féminin.
TARGET Unity URP, FBX + texture 2K, cible 1800 triangles par gant à la génération ; preuve au cadrage du combat et gros plan des mains.

Workflow : Meshy multi-vues 7.1, géométrie 2K, 35 crédits annoncés, source conservée ; Blender pour échelle/orientation/miroir sans décimation ; Unity pour ajustement et contrôle ; atelier local pour équipement et duel. Pas de backend ni EAS. Acceptation artistique finale réservée à l’auteur.
