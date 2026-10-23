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
Le gros plan montre les doigts entourant réellement la poignée affinée.

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
Le pilote n’est donc pas ajouté aux prefabs actifs, à l’atelier ou au duel. Pas de rebuild
iOS, Maestro, EAS ni modification du backend pour cet asset encore non validé en mouvement.
