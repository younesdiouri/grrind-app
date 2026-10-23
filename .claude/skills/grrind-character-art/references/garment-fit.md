# Raccord d'un vêtement au corps

Lire avant d'accepter un vêtement porté. Le 21 octobre 2026, le t-shirt corail a été déclaré
prêt malgré un cou apparent trop long et un col mal raccordé. Les captures de rejet sont dans
`artifacts/avatar-customization-archive-2026-10-23/references/quaternius-poc/neck-fit-review/`. Un flow vert et un FBX valide ne valident pas le fit.

- Comparer la tenue approuvée et le nouvel item sur **le même corps, avec la même pose,
  caméra, lumière et taille de tête**. Exporter face, trois quarts, profil et dos, puis un
  gros plan du cou/col et des épaules. Inspecter aussi à la taille d'affichage dans l'app.
- Mesurer hauteur de tête, distance menton–bord avant du col, hauteur et profondeur du col,
  et distance peau–tissu. Distinguer une coupe volontairement ouverte d'une anomalie : la
  peau doit rejoindre les clavicules et le torse, sans colonne de cou ni bord qui flotte devant.
  Le rejet corail montrait environ 0,50 tête de cou apparent contre 0,30 sur la tenue fantasy
  (relevé indicatif sur des cadrages légèrement différents, pas une tolérance universelle).
- Vérifier l'ouverture complète autour du cou, les retours latéraux et le dos, les emmanchures,
  poignets et taille. Aucun trou involontaire, extrémité libre, bord flottant ni pénétration
  visible. Contrôler les poses de combat après le repos : le transfert de poids seul ne suffit pas.
- Vérifier le **corps réellement affiché**. Une extension de cou créée pour rester cachée sous
  un col haut ne convient pas automatiquement à un t-shirt. Préserver l'anatomie Quaternius ;
  ajuster le vêtement et les découpes de peau, sans déplacer la tête ou la caméra pour masquer
  le défaut. La boîte englobante du vêtement ne donne pas la position de son encolure.
- Consigner chaque défaut, sa mesure, la correction et le rendu suivant. Tant qu'un défaut
  reste visible, réitérer à l'étape responsable et ne pas annoncer « prêt ». Après deux
  corrections échouées du même défaut, arrêter l'empilement et reformuler le fit ou l'entrée.
  Une revue visuelle indépendante peut aider si l'utilisateur autorise un sous-agent ; elle
  ne remplace ni les mesures ni son verdict personnel.

- **Épaules, manches et matière** : regarder aussi les volumes en argile et le rendu sans
  éclairage pour distinguer pli du mesh, ombre peinte et normale incorrecte. Un pic triangulaire
  ou un coude de manche cassé impose de reprendre le fit, les poids ou la source ; une texture
  ne le répare pas. Ne pas déplacer indépendamment X/Z vers chaque relief musculaire du corps.
- Pour une demande de coton/denim, une couleur plate ne suffit pas. Montrer la matière au
  cadrage du jeu et dans un détail vêtement : grain mesuré à cette échelle, rugosité mate,
  normales et filtrage cohérents, sans bruit ni gros reflets plastiques. L'auteur a rejeté
  les épaules anguleuses et l'aspect RPG ancien du premier tee ; le col corrigé reste la
  référence à préserver pendant cette itération.
- Si le vêtement est correct en pose de liaison mais cassé une fois animé, comparer les poids
  avant de toucher encore aux formes. Le transfert depuis une peau nue peut disperser le col
  entre tête, cou et clavicules. Prévoir une pondération continue torse–bras, garder l'ourlet
  hors de l'influence des bras et tester la jonction sur les vrais gestes. Reconstruire les
  normales de shading aux coutures UV après fit, sans lisser/décimer la géométrie texturée.


## Enseignements des corrections anatomiques

La revue Astra demandée pour le t-shirt du 22 octobre était propre à cette tâche.
Pour une nouvelle tâche, suivre AGENTS.md : sous-agent uniquement sur demande utilisateur.
Comparer les preuves courantes et conserver les défauts ouverts ; un PASS technique ne
remplace pas le verdict artistique de l'auteur. Les rejets historiques sont archivés sous
`artifacts/avatar-customization-archive-2026-10-23/references/quaternius-poc/`.

- Une découpe horizontale au niveau du cou peut aussi couper les sommets des deltoïdes.
  Identifier la composante tête/cou après séparation et conserver les épaules ; compter les
  ouvertures du vêtement (col, deux manches, taille). Une hauteur d'os ne définit pas l'encolure.
- Un seul contrôleur modifie la scène Unity pendant une série de captures. Ne jamais lancer
  en même temps export de poses et captures d'angles. Vérifier identité du corps, cadrage,
  angle et phase dans les pixels, puis rattacher les preuves au hash des assets courants.
  Vérifier aussi que le PlayerLoop avance réellement : un éditeur non focalisé peut garder
  `Time.frameCount` figé et rendre le SMR de la pose précédente malgré `graph.Evaluate`.
  Activer `Application.runInBackground` pour la QA et conserver frame/phase/avatar avec le PNG.
- Les scripts Blender lancés en terminal utilisent `--python-exit-code 1` : sans ce drapeau,
  une exception Python peut laisser un code de sortie nul et l'ancien FBX en place.
- Un vêtement ouvert peut sortir d'un recalcul de normales avec son orientation globale
  inversée. Mesurer leur sens sur une zone frontale connue ; le matériau double face sert
  à voir l'intérieur des manches, pas à accepter une surface extérieure éclairée à l'envers.

- Avant de réduire encore un vêtement qui traverse un bras, capturer le corps natif sans
  vêtement dans exactement la pose et la phase fautives. Un retarget peut laisser moins
  de marge que l’épaisseur du tissu ; ajuster alors le clip à la morphologie, puis revoir
  toutes ses phases. Une correction de peau masquée ne répare pas un avant-bras coupé.
- Pour une fuite peau/tissu, mesurer les **deux triangles** superposés : marge au bind et
  poids après export. Une marge positive ne suffit pas si leurs champs de déformation
  divergent. Définir les bandes de poids en mètres sur la surface ; un nombre de rangées
  ne garantit pas leur largeur. Une passe ID rapprochée distingue pénétration et ombrage.
- Classer la partie anatomique avant de corriger : une seule couleur « peau » peut faire
  prendre un doigt visible derrière l’épaule pour une fuite du cou. Donner des ID distincts
  au cou et aux mains, puis localiser le triangle. Sur un vêtement ouvert, une distance
  signée au triangle le plus proche ne prouve pas une pénétration : confirmer par
  intersections de triangles et images. Un `BakeMesh` doit correspondre à la frame rendue,
  y compris pendant un balayage de poses ; ne pas valider une boucle de relevés périmés.
- Contrôler le champ **après** la limite d’influences. Un blend de sept poids réduit aux
  quatre plus grands peut faire remplacer brutalement `spine_03` par `Head` et créer un
  cran sans déplacer le mesh au bind. Vérifier les deux extrémités du fondu, y compris les
  sommets interpolés par une coupe. Le pruning doit rester continu et retrouver les poids
  natifs à la sortie ; déplacer la cassure au plafond du fondu ne la résout pas.
- Vérifier aussi la **qualité effective Unity**. Dans ce spike, `QualitySettings.skinWeights`
  à `TwoBones` tronquait encore rendu et `BakeMesh` malgré le SMR réglé sur `Bone4` : le
  changement de clavicule dominante créait un cran de 6 px. La somme manuelle des matrices
  à deux influences reproduisait le défaut, celle à quatre le supprimait. Garder quatre
  influences dans les niveaux de qualité utilisés, vérifier le runtime et l’inclure dans
  l’identité des preuves ; les relevés faits à deux influences ne valident pas le rendu à quatre.
- Si la taille du pantalon traverse l’ourlet pendant une esquive, comparer les champs
  de déformation avant de rétrécir davantage les cuisses. Un ourlet lié au seul torse
  peut rester en place pendant que la jambe monte. Faire suivre progressivement le bas
  par les cuisses, sans changer le haut, puis contrôler le champ après épaisseur,
  limite d’influences et réimport Unity : son seuil de poids peut modifier le résultat.
- Une marque noire ou blanche absente en argile impose des passes albedo seule et
  normale seule. Contrôler le texel et son rayon vers le donneur : si la ligne manque
  la surface HIGH, allonger la distance ne suffit pas. Adapter la projection ou sa cage,
  sans déformer le vêtement validé. Vérifier que la cage part de l’extérieur du donneur :
  atteindre sa face intérieure peut remplir la couleur et inverser les normales.
  Une normale projetée ne doit pas replaquer la morphologie du donneur sur la coupe
  ajustée : séparer son relief fin des différences de volume. Chaque morphologie
  à UV distinctes reçoit ses cartes.
- Trois phases fixes ne valident pas un mouvement : en vidéo Simulator, l’esquive
  féminine a laissé passer des doigts dans le tee entre les poses contrôlées. Balayer
  mains/tissu et bras/bras sur les vrais clips, densifier les entrées/sorties de blend
  et tester la garde d’arène (`inspect=false`), distincte du repos de l’atelier.
  Une vidéo rejetée retire le PASS mobile même si le parcours fonctionnel reste vert.
- Pour un contact pantalon/ourlet, identifier les triangles au bind puis revoir la
  phase exacte en argile et en ID aux quatre angles. Un compteur ne distingue pas
  une percée extérieure d’un croisement caché derrière la paroi proche. Consigner
  explicitement cette différence avec le verdict de revue ; une phase voisine ne valide
  pas le contact manquant. Écarter un correctif qui déforme largement la coupe pour
  retirer un contact caché, et corriger toute dent ou percée effectivement visible.
- Si « Refreshing… » apparaît pendant une preuve mobile, geler aussi les écritures
  de QA dans le projet. Capturer et extraire dans un dossier hors de la racine Metro,
  puis copier les preuves après la séquence. Une capture calme vérifie ce symptôme ;
  elle ne mesure pas la cadence ni ne démontre seule la cause d'un rafraîchissement.
