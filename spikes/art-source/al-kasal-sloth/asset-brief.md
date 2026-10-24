ASSET      CR_AlKasal
CATEGORY   creature, heavy biped
VIEWS      front.png face, side.png profil, back.png dos ; vues ImageGen orthographiques approximatives, sujet 96 % de la hauteur
SCALE      2.6 m debout, inféré pour un boss comparé au sportif Quaternius de 1.8 m ; origine au sol
PROPORTIONS repères face 1214 × 1295 : corps y22..1261, tête y22..352 ; largeur totale x28..1187 ; tête x361..842 ; épaules x278..930 ; ventre x331..893 ; pieds x298..936. Ratios : largeur/hauteur .935 ; tête/hauteur .266 ; largeur tête/hauteur .388 ; épaules/hauteur .526 ; ventre/hauteur .454 ; pieds/hauteur .515 ; bras jusqu’à .9 de la hauteur ; jambes ~.24 de la hauteur. Tolérance 5 % du pilote. Le script heads_tall.py donne 5.02 mais son cou détecté tombe dans la tête : mesure T-pose non applicable au paresseux à capuche.
PARTS      corps, sweat et chaussons sur un mesh texturé ; pas de membre détaché ajouté ; réaction du corps entier dans Unity
SILHOUETTE tête compacte de paresseux, ventre large, bras très longs, chaussons, capuche pliée
MATERIALS  fourrure taupe et crème mate, sweat prune, fermeture menthe ; une texture sRGB 2k, rugosité .85, métal 0
ARTICULATION V1 sans attaque du boss : respiration, balancement et recul global au contact ; seuls les sportifs utilisent leur rig et les clips de mêlée existants
INFERRED   profondeur depuis profil généré, dessous des chaussons, échelle, mouvement de repos et recul
TARGET     Unity 6000.3 / iOS, FBX, ~6000 triangles à la génération, pas de décimation ni lissage ensuite ; hauteur finale ~500 px sur iPhone paysage
