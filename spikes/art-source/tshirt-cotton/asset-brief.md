# T-shirt coton — itération de matière et coupe

ASSET PR_TshirtCotton ; vêtement déformable sur les deux squelettes Quaternius.
CATEGORY prop / modular garment.
VIEWS ImageGen, face/dos/profil orthographiques ; trois vues découpées sans génération de corps.
SCALE mètres, dimensions natives Quaternius ; hanches/épaules/cou mesurés dans le FBX.
PROPORTIONS référence face 577×587 px environ, largeur/hauteur 0,98 ; fit volontairement adapté aux épaules natives de chaque corps, aucune modification de tête/squelette.
PARTS tee creux, col ras-du-cou fin, manches courtes ; peau Quaternius découpée séparément.
SILHOUETTE épaule ronde continue, manche tubulaire ouverte, torse sobre sans plis triangulaires.
MATERIALS coton jersey chiné mat, gris bleu sourd, col/bords ton sur ton, petit éclair écru poitrine gauche ; PBR base/normal/roughness, métal nul. Variante chaude corail désaturée par teinte de matériau.
ARTICULATION vrais os Quaternius, poids continus torse–bras pour le tee, quatre influences maximum par sommet du tee et de la peau, sept poses au contact et vues intermédiaires ciblées.
INFERRED profondeur et adaptation aux deux thorax ; aucun tissu simulé. L’ancienne texture et le shader toon ne servent plus au tee.
TARGET Unity URP/Lit sur Simulator iPhone, atlas plafonnés à 2k dans Unity, corps complet et nouvelle vue Tissu. Source Meshy : budget 10 000 triangles, résultat 10 304 conservé dans source.glb. Topologie livrée reconstruite depuis les corps CC0 avant UV et rebake : 34 064 triangles homme / 38 640 femme (hors petits bords de 0,8 mm), quatre influences maximum. Budget de héros de proximité, LOD et performance iPhone physique hors de ce spike.

Demande : retirer les plis anguleux épaules/manches et obtenir un vrai aspect coton, plus sobre. Ne pas conserver un défaut au motif que le flow est vert. Revoir col, silhouette, matière et déformation avant export natif. Aucun commit/PR.

Reprise anatomique du 22 octobre : les anciens fits Meshy sont rejetés. Le maillage final conserve les ouvertures natives et reçoit un panneau coton continu, des poids de torse réguliers et une marge sur le vrai pantalon. Le corps source et le vêtement sont comparés aux mêmes phases. Les cartes Meshy sont rebakées sur les nouvelles UV GameUV ; aucune ancienne texture UV n’est réutilisée sur la retopologie. Revue Astra détaillée obligatoire avant présentation, puis relecture du même asset installé dans le Simulator.
