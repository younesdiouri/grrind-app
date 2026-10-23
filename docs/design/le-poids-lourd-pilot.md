# Le Poids Lourd — pilote d’haltère

Demande du 23 octobre 2026 : un gros haltère un peu drôle, dans la suite des gants dorés.
Une référence ImageGen et une génération Meshy 7.1 ont produit l’objet pour **35 crédits**.

## Livrable et prise

Source GLB, référence trois vues, FBX, texture, paramètres, provenance et script Blender dans
`spikes/art-source/le-poids-lourd/`. Le master Blender local est conservé dans ce dossier.
**1 974 triangles**, un matériau, texture sRGB 2K ; dimensions **650 × 300 × 300 mm**.
Le réimport conserve les 1 974 triangles et la hauteur de 300 mm. Le contrôle générique
signale le dessous de sol : c’est attendu pour un pivot au centre de la poignée, pas au sol.
Le validateur topologique n’a aucun échec ; les sommets séparés aux UV/normales de Meshy
sont conservés, sans recalcul global des normales ni décimation après texture.

La poignée brute mesurait 56,6 × 49 mm. Blender la ramène à 25 mm et raccorde progressivement
les colliers sans modifier les masses. L’objet est volontairement plus allongé que la source
(longueur/diamètre 2,17 contre 1,66) pour dégager la main. Ces dimensions sont inférées.

Essai Unity sur les deux corps : objet attaché à RightHand, centre local (0,024 ; 0,100 ; 0) m,
rotation locale (0 ; 90 ; 0)°, doigts maintenus aux rotations du direct au contact, conservées
dans `grip-rotations.txt`. Le retrait rétablit l’animation ; gants et haltère étaient exclusifs.
Cette première lecture visuelle était incorrecte : le retour de l’auteur ci-dessous montre
que la poignée reste devant les doigts féminins. La stabilité seule ne prouve pas une prise.

Preuves retenues dans `references/quaternius-poc/le-poids-lourd/` : repos, direct au contact
et prise vus depuis l’autre côté. Ce sont des captures Unity, pas des images de l’app.

## Limite bloquante — animations

**G3 échoue : ne pas activer cet objet en combat avec les clips de boxe actuels.**
Les 28 captures de contact homme/femme ne suffisent pas : la vérification des phases
0,25 / 0,5 / 0,75 sur les sept gestes féminins révèle des collisions dans les retours en garde.
Un volume cylindrique conservateur des disques (rayon 140 mm, |x| de 150 à 310 mm), testé sur
les sommets des meshes skinnés, détecte notamment la tête pendant le direct et la relance,
ainsi que la main/avant-bras gauche pendant l’uppercut. Le gros plan confirme cette dernière.
Ces comptages sont un diagnostic de pénétration, pas une distance exacte entre surfaces.

La prise reste stable ; c’est l’espace réservé par les gestes de boxe qui manque.
Suite nécessaire : une garde et des coups adaptés à l’haltère, puis contrôle continu des
transitions sur les deux corps. Réduire la poignée ou masquer les mains ne corrige pas cela.
Le premier pilote n’avait donc pas été ajouté à l’app.

## Essai atelier demandé par l’auteur

Le 23 octobre, l’auteur demande : « Mets quand même l’haltère dans l’atelier sur le simulateur,
je veux voir ce que ça donne avec les mains. On adaptera les animations après. »
L’objet est désormais sélectionnable dans **Tenue → Équiper Le Poids Lourd**, avec **Prise**
pour le gros plan. Il remplace les gants ; le retrait restitue la main animée.
Le changement de corps conserve la sélection. L’haltère reste limité au mode inspection
Unity : le duel et le combat normal ne l’équipent pas, même si la configuration le demande.
Le message d’atelier indique que les animations restent à adapter. Les collisions décrites
ci-dessus sont acceptées pour cet essai personnel, pas validées pour le combat.

La tranche Simulator est reconstruite pour embarquer le mesh. Pas d’EAS, de changement
backend ou de reconstruction iPhone physique.

Vérification : compilation Unity et app hôte réussies ; 16 fichiers de données et UUID du
framework installé identiques à la compilation. Contrôles Unity de prise, retrait, exclusion
mutuelle des gants et limitation à l’inspection réussis. Typecheck, lint, 559 tests et 29 previews
passent. Le parcours `quaternius-poc.yaml` passe, session `2026-10-23_142013` ; les captures
homme/femme et retrait sont dans `references/quaternius-poc/le-poids-lourd/workshop/`.
Une première passe a été arrêtée après constat visuel : le repos cachait la prise derrière
le corps. Le bouton **Prise** fige désormais le direct et choisit l’angle opposé ; les nouvelles
captures montrent la poignée. Les mouvements eux-mêmes n’ont pas été corrigés.

## Correction de la prise fermée

Retour de l’auteur : « les mains touchent l’haltere mais ne l’enroulent pas ».
Les deux références générées demandent une prise cylindrique avec quatre doigts repliés
et le pouce opposé. Aucun nouveau mesh ni génération payante : correction du rig existant.

La base de l’index féminin est à Y=88,2 mm dans la main, contre 117,4 mm chez l’homme.
Réutiliser le même point d’attache à Y=100 mm plaçait donc la poignée devant le poing féminin.
Les poses de boxe originales ne sont plus utilisées comme poses de prise.

| Corps | Centre de poignée local (mm) | Axe local normalisé |
| --- | --- | --- |
| Homme | (23, 99, 0) | normalize(0, 0.24, 1) |
| Femme | (20, 70, 0) | normalize(0, 0.24, 1) |

Les rotations de phalanges sont conservées dans `spikes/art-source/hand-grips/`, par anatomie.
Elles ont été ajustées dans Unity : chaînes de doigts autour de l’axe de la poignée inclinée
selon la ligne des articulations, puis opposition du pouce. Le diamètre reste 25 mm.
`WeaponGrip` applique ces poses après échantillonnage des animations : un autre objet à poignée
peut réutiliser ce composant, avec son point d’attache et une pose adaptée à son diamètre.
Cela ne prétend pas adapter automatiquement toutes les armes ou toutes les tailles de manche.
Les animations du bras restent un travail distinct, comme demandé.

Le validateur vérifie maintenant que l’axe est à l’intérieur du contour de chaque doigt
(projection des articulations sur le plan transversal, winding de 360°), en plus de l’exclusion
des gants et de la restitution de l’animation au retrait. Ce contrôle ne remplace pas la
vérification des surfaces : les gros plans paume et trois-quarts sont conservés dans `grip-fix/`.

Le contrôle négatif remet l’ancien point (24, 100, 0) mm sur le corps féminin : aucun des
quatre contours n’entoure alors l’axe, contre quatre avec le réglage corrigé. Les 70 états
(7 gestes × 5 phases × 2 corps) conservent exactement les rotations locales de prise.

Validation finale : typecheck, lint et 559 tests passent. Builds framework et hôte Simulator
réussis ; UUID et 16 fichiers de données installés vérifiés. Le parcours `quaternius-poc.yaml`
passe en 3 min 20 s (session `2026-10-23_144305`) ; captures homme/femme et retrait inspectées.
Le Simulator reste ouvert sur la prise féminine corrigée. Le verdict artistique de l’auteur
sur cette correction reste à recueillir.
