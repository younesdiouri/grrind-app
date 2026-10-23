# Spike de personnalisation Quaternius

**23 octobre 2026 — PASS Astra sur le Simulator, essai personnel de l’auteur attendu.**
Astra implémente la correction, une seconde instance Astra relit les preuves.
La géométrie **32640d627d80** a reçu un PASS Astra détaillé. La matière **authored2** a aussi reçu un PASS Astra sur22 vues. Les
transitions continues ont révélé un FAIL sur Simulator : doigts dans le bas du tee
féminin pendant une transition d’esquive. La correction de mouvement **685504540f41**
a reçu le PASS Astra dans Unity puis sur le binaire réellement installé. Aucun
commit, PR ou push.

Le prototype local propose deux corps Quaternius, quatre teints, trois couleurs
d’iris, quatre coiffures et trois couleurs de cheveux. Les tenues Fantasy et sport,
les bottes et le bandeau restent comparables dans l’atelier. Le bandeau est ajusté
aux trois coupes courtes et masqué sur les cheveux longs. Avatar personnel et
persistance relèvent du ticket backend ; les réglages du spike restent locaux.

La chaîne utilisée est **ImageGen → Meshy → Blender → Unity**. Les trois vues
ImageGen et le GLB Meshy de 10 304 triangles sont conservés dans
`spikes/art-source/tshirt-cotton/`. La tâche coton
`01a1604f-621e-769f-9b31-fcf8c803a718` a coûté 35 crédits, soit 105 crédits avec
les deux essais précédents. Aucun appel payant supplémentaire pour cette correction.
Aucun corps humain n’a été généré.

Le GLB fournit le dessin de référence. Le vêtement livré est une retopologie
issue des corps CC0 Quaternius, avec coupe coton inférée, UV nouvelles et rig natif ;
la topologie et les UV Meshy ne sont pas conservées. **La matière finale est reconstruite
dans Blender**, conformément à la demande d’une texture différente et plus sobre.
Elle ne doit pas être présentée comme une projection intacte des cartes Meshy.

Le premier rebake 2k Meshy a été rejeté par Astra pour des faux trous et un grain
ondulé. Les rayons manquaient le donneur ou atteignaient son intérieur ; les essais de
cage ont réduit ces défauts sans rendre le transfert assez robuste. Cette approche
est abandonnée pour le résultat livré, tout en conservant sa source et ses diagnostics.
La nouvelle cible est un coton mat, à grain fin de faible contraste, cuit sur les UV
finales : base sRGB, normale linéaire et métal nul, un jeu de cartes 2k par corps.
Le shader Blender emploie une rugosité de 0,82–0,88, un bruit à 220/m, un relief
de 0,35 mm à force 0,6 et un éclair de 48 mm. Le bake utilise une copie exacte du LOW comme
donneur, extrusion 1 mm et portée 3 mm. Le reçu `authored-cotton-receipt.json`
confirme que positions et UV du LOW sont inchangées pour les deux corps. La cuisson 2k est terminée ; Astra a relu22 vues et vérifié les huit hash de
texture/matériau. La matière authored2 passe le contrôle statique, avec grain chiné
visible au macro et discret au cadrage joueur. Le premier coton Blender, trop
lisse et quasi neutre en8bits, reste un FAIL historique.

Les corrections comprennent :

- Un panneau de torse continu et des manches ouvertes, avec marges mesurées et
  pondération continue. Les positions de la surface native de peau sont conservées
  au bind ; les découpes et les poids près du col sont adaptés au vêtement.
- Un raccord peau/col commun : bande de tissu de 18 mm puis fondu géodésique jusqu’à
  60 mm ; peau commune sur 20 mm puis fondu jusqu’à 45 mm. Une réduction continue
  des influences évite les changements brutaux d’os dominants tout en gardant
  au plus quatre influences et les poids natifs à la sortie du fondu.
- Une qualité Unity effective **FourBones** dans les niveaux utilisés. Le réglage
  global TwoBones tronquait les poids malgré le SMR Bone4 et créait le cran du cou.
  Le défaut est reproduit par la somme à deux influences, puis absent à quatre.
- Des copies des clips Mixamo adaptées aux deux corps vêtus, garde comprise : bras
  avant/arrière −0,28, avant-bras +0,35, twist gauche +0,30 et droit +0,20.
  Le combo reçoit un twist droit supplémentaire de +0,10 pour séparer les poings.
  Les FBX source sont intacts ; le builder repart des sources à chaque exécution.
- Un pantalon Peasant entier ajusté sous le tee dans l’espace de rebind réel ; les
  découpes qui exposaient le fond ont été retirées. Cheveux et yeux restent visibles
  pendant l’esquive grâce à l’actualisation des limites des SMR. La coupe courte
  féminine est ajustée hors du crâne.

- Le bas féminin suit partiellement les cuisses : amplitude 0,4, fondu de 1,01 à
  1,12 m, partage gauche/droite continu sur 12 cm et réduction continue à quatre
  influences après création du bord. Le pantalon et les positions au bind sont
  conservés. Sur le jeu initial de poses, le candidat puis l’asset réellement importé
  passent chacun 27 poses sans croisement pantalon/tissu, y compris six phases adjacentes à l’esquive.
  Unity supprime certaines influences très faibles : l’écart maximal mesuré de 0,28 mm
  impose de vérifier le FBX importé plutôt que de transférer le verdict du candidat.

La référence géométrique courante est **32640d627d80**. Son `source.json` inclut
FBX, clip, dépendances et `QualitySettings.asset`. Les nouvelles captures gardent
frame, pose, phase et qualité runtime ; le PlayerLoop doit avancer. Les anciens
libellés de phase, les captures à deux influences et les anciennes validations coton
ne valident pas cette référence. Les premiers rapports Astra distinguent leurs
constats locaux et leurs FAIL. Le rapport `artifacts/unity-spike/astra-review-32640d627d80.md`
lève le dernier défaut bloquant et autorise le passage au coton. Il détaille les
vues relues, les mesures et les limites : des états échantillonnés ne prouvent pas
chaque instant des transitions continues.

La sortie exige une revue Astra des deux corps, cols/épaules/manches/bras, repos et
sept gestes avec phases intermédiaires, angles complémentaires, argile puis matière.
Un parcours vert ne remplace pas cette revue. Le premier binaire était installé
sur le Simulator GRRIND E2E : UUID Unity940ECAC0-6E8F-3390-89F2-14E40360A1C9 et
16/16 fichiersData SHA256 identiques entre build, xcframework, appDebug et copie
réellement installée (`artifacts/unity-spike/root-native-copy-identity.json`).
Le parcours unique `.maestro/quaternius-poc.yaml` passe en mode offline :1/1,
2m40, aucun second flow. La vidéo Simulator a ensuite révélé une traversée brève des doigts dans le tee
féminin pendant l’esquive (vers1,5s). Le flow reste PASS fonctionnel, mais cette
version native est **FAIL visuel** ; une correction du mouvement et une nouvelle
vérification du binaire installé sont requises. La validation personnelle finale de l’auteur reste attendue.

La correction de mouvement **01232b9106fe** a été mesurée sur 432 états : deux corps,
27 phases et huit états, dont la garde réelle d’arène. Aucun croisement main/tee,
mais un contact entre les poings et neuf états de contact pantalon/tee ont nécessité
une revue ciblée. Le combo persisté **685504540f41** passe ensuite ses 54 états,
sans croisement main/tee, bras/bras ni pantalon/tee. Les six phases communes au
pilote ont exactement les mêmes positions de peau et tissu après persistance.
Les contacts d’ourlet incluent des panneaux extérieurs, pas seulement le bord épais.
Astra a relu leurs phases exactes en argile et en ID aux quatre angles : ils restent
cachés derrière la paroi proche, sans percée extérieure lisible. Le petit retour sous
l’ouverture féminine est une finition intérieure ; le candidat supplémentaire de
pondération ne l’améliore pas et est abandonné. Les FBX et la matière restent donc
inchangés. La revue finale des 36 vues de mouvement, 24 vues masculines ciblées et
huit vues du candidat féminin donne le PASS local Unity de **685504540f41** pour
export natif. Ce PASS Editor seul ne levait pas le FAIL du binaire Simulator précédent.

Après le redémarrage de l’ordinateur, le binaire corrigé a été réinstallé le23octobre
sans nouvelle compilation. Les16 fichiers Data concordent entre build Unity,
xcframework, appDebug et conteneur réellement installé64C0C551. L’UUID du code natif
est inchangé ; trois fichiers Data diffèrent de l’ancienne version, dont
`resources.assets` qui porte le nouveau contenu. La preuve est conservée dans
`references/quaternius-poc/anatomy-review/685504540f41/simulator/native-identity.json`.

Astra a revu11vidéos de ce binaire : direct/esquive/combo des deux corps en plein
corps, esquive et combo en détail, duel avec garde réelle, victoire puis retour portrait.
Les séquences critiques sont relues à12images/s, les pleins corps à6images/s.
Le défaut des doigts dans le tee féminin est absent des cycles examinés ; cols,
épaules, manches, bras, ourlets et coton reçoivent le PASS visuel ciblé.
Le rapport détaillé conserve les limites d’échantillonnage et les petites finitions
intérieures déjà classées. L’ancien lot reste un FAIL historique. Le flow complet
JS n’a pas été répété : ses contrôles précédents restent distincts des nouvelles
preuves natives. Un bandeau dev « Refreshing… » a été relevé dans la première vidéo
de duel. Une capture ciblée de39,82s, réalisée hors du projet avec les écritures
du repo gelées, passe aussi la revue Astra : deux acteurs pendant le combat,
victoire puis retour portrait, aucun bandeau observé. Le résultat opaque masque
normalement les acteurs après la victoire ; l’entrée d’un acteur précède légèrement
la présence des deux. Cela ne constitue pas une mesure instrumentée de performance
ni une attribution certaine de la cause du premier bandeau.

Le Simulator reste ouvert pour l’essai de l’auteur : femme, teint hâlé, yeux verts,
chignons châtains et bandeau cyan, T-shirt sport Ardoise, caméra Tissu. Metro8082
reste actif ; aucun commit, PR, push, reset ni modification backend.

Les contrôles JS de l’atelier passent : typecheck, lint des deux fichiers modifiés,
trois tests `unityFrame` et `previews:check`. Ces contrôles ne prouvent pas le fit 3D.
Les licences CC0 et la provenance ImageGen/Meshy restent distinctes. Il n’y a ni
simulation textile, ni persistance backend, ni mesure de performance sur iPhone
physique dans ce spike.

## Nettoyage avant livraison — 23 octobre 2026

Les essais abandonnés (tshirt-eclair, sources et textures Meshy du coton), captures de corrections antérieures à `685504540f41` et réponses de téléchargement temporaires sont archivés localement sous `artifacts/avatar-customization-archive-2026-10-23/`, avec leurs chemins relatifs et un manifeste. Les références historiques ci-dessus vers ces fichiers désignent cette archive, non des assets livrés. La dernière revue `685504540f41`, les captures de personnalisation et les preuves Les Guinzz restent versionnées. Le générateur natif ne charge plus le donneur Meshy inutilisé ; les textures coton finales et leurs entrées de packaging sont conservées.
