# Avatars sportifs rétro — construction V2

La [planche D](references/retro-avatars-approved.png) reste la référence de style choisie.
Les premiers calques V1 ont été rejetés : baskets sous les palmes, prise d’haltère bricolée,
ceintures et gourdes sans support crédible. Les captures de cette version ne sont pas des
références approuvées. La V2 corrige la construction plutôt que multiplier les réglages par pose.

## Choix de construction

Quatre identités : STRENGTH_V2, RUNNER_V2, CLIMBER_V2, SWIMMER_V2. Toutes ont une tenue neutre,
la tête nue et **les pieds nus**. Une garde maître par identité est réutilisée pour idle,
attack, hit, critical, dodge, combo et replay. Ce ne sont donc pas sept dessins anatomiques
indépendants : les mouvements du combat transforment le personnage équipé entier.
Cette limite V1 est volontaire ; une future animation articulée devra préserver les contacts.

Le poing extérieur est fermé en prise verticale, dégagé du torse, avec du vide au-dessus et
en dessous. L’arme est dessinée derrière le corps : le poing masque la poignée naturellement.
Aucun masque rectangulaire de doigts, morceau de peau dans l’item ou correctif par arme/pose.
L’haltère vertical définit cette famille de prise ; une arme qui ne s’y adapte pas est refusée
ou reçoit une autre famille explicite, jamais des coordonnées improvisées pour chaque état.

Les palmes ont un chausson opaque qui couvre talon, dessus et orteils. Le pied arrière fait
face à la caméra, l’autre pointe de côté : **deux dessins de perspective**, pas le même item
retourné artificiellement. Les ancrages appartiennent à chaque silhouette. La cape est portée
sur les épaules derrière le corps ; elle réutilise l’item existant TRAVELERS_CLOAK sans modifier
ses caractéristiques, son prix ou son nom canonique dans l’inventaire.

| Calque visible V1 | Emplacement | Construction |
| --- | --- | --- |
| Haltère ego | WEAPON | hand, derrière le poing |
| Lunettes de course-poursuite | HEAD | eyes, devant |
| Prise de tête / Bonnet de bain de minuit | HEAD | head, devant |
| Palmes académiques | FEET | footRear de face + footFront de côté |
| Cape du voyageur | CHEST | shoulder, derrière le corps |

Une seule pièce par emplacement : lunettes et coiffes s’excluent. Ceinture, gourde et sac à
magnésie n’ont plus de pack actif. Ils restent dans les inventaires ; les nouveaux combats
conservent leur clé avec artworkVersion=null, sans calque affiché. Les versions V1 archivées
restent lisibles pour leurs anciens replays, sans être proposées dans le choix d’avatar/atelier.
Les profils existants passent à la V2 correspondante ; aucune progression n’est réinitialisée.

## Essayer et configurer

Réglages → Ton héros : choisir et sauvegarder le sportif. Inventaire et prochains combats
utilisent ce choix. Réglages → Atelier des avatars (development build) : équiper les objets,
inspecter les deux sens puis jouer une démonstration. Les boutons d’état partagent la garde ;
la démonstration montre les mouvements. Aucun gain ni changement d’inventaire dans cet atelier.

Backend : http://localhost:8080/admin/artwork, session administrateur. Les objets actifs et
avatars actuels s’y composent réellement. Le menu « Avatars et calques » édite disponibilité,
nom, ordre, chemins PNG, ancrages, plans, proportions et pivots. Les prix/modificateurs restent
dans le catalogue numérique avec sa publication habituelle. L’import PNG sécurisé renvoie
un chemin /game-images/<hash>.png utilisable dans un manifeste.

Le backend ../grrind possède public/artwork/ et config/artwork/retro-v2.json (4 avatars,
6 packs d’objets). Les anciennes migrations/manifeste sont figés. Nouvelle DA incompatible =
nouveaux chemins et version ; les combats figent appearance et key+artworkVersion. Les packs
inactifs restent disponibles pour la relecture, pas pour les nouveaux choix.

## Générer et exporter

Le skill grrind-art-direction porte les contraintes et refus. Les huit prompts ImageGen
intégré sont conservés dans [le journal V2](references/retro-v2-generation.json).
Les sources locales sont dans artifacts/artwork-v2/source/ ; les PNG prêts à jouer sont
versionnés dans le backend. Le client embarque aussi la garde Muscu pieds nus comme repli.

1. Éditer le maître de référence avec ImageGen intégré : identité préservée, pieds nus,
   poing vertical fermé hors du torse. Contrôler l’anatomie avant de décliner les identités.
2. Générer chaque objet seul en vrai alpha, sans corps ni main peinte dedans. Une image
   équipée générée d’un bloc ne prouve pas que ses calques fonctionnent.
3. Exporter mécaniquement : `swift scripts/prepare-retro-art.swift guard SOURCE.png DEST`
   pour une base, ou `item SOURCE.png DEST` pour l’objet. Grille 256², corps 512² par
   agrandissement entier, miniatures 256², alpha binaire, miroir sans redessin.
4. Calibrer UNE série d’ancrages par identité, copiée sur les sept états. back regarde à
   droite, front à gauche ; x → 1-x, rotate → -rotate, pivot.x → 1-pivot.x. Les deux palmes
   gardent leurs perspectives différentes quand l’ensemble est reflété.
5. Composer avec `swift scripts/render-retro-proofs.swift MANIFESTE PUBLIC SORTIE [ITEM]`.
   Inspecter les bandes *-guards.png et overview.png : pieds nus, chaque objet isolément,
   puis coiffe + arme + palmes + cape ensemble, sur les quatre identités dans les deux sens.
   Les sept lignes de la matrice partagent la même garde ; leur nombre ne constitue pas
   sept preuves indépendantes. Ne pas confondre présence des fichiers et qualité visuelle.
6. Côté backend, `make console c=app:artwork:import` charge le manifeste V2. Il peut écraser
   le calibrage admin de ces mêmes packs : exporter les réglages à conserver avant réimport.
7. Tester le flow existant .maestro/appearances.yaml avec le binaire installé et Metro,
   sans build natif ; inspecter aussi le combat et l’inventaire à la taille réelle sur iPhone.

## Critères de refus et performance

Refuser un pied/ancienne chaussure qui dépasse, un chausson vide, une arme qui flotte ou
traverse les doigts, une cape sans contact d’épaule, une boucle sans attache. Vérifier en
zoom et vers 96–128 px sur le fond sombre du front. Le style rétro ne justifie pas l’anatomie
incohérente. Les screenshots précédents n’avaient pas satisfait ces critères malgré les tests.

Même parent et horloge Reanimated pour corps et objets. Une garde partagée ne monte qu’une
image corporelle : pas sept couches identiques. Chargement avant combat, cache des sources,
aucun bitmap calculé à chaque frame. Les nouveaux corps n’ont pas de foregroundUrls ; le
support historique reste uniquement pour les replays V1. Le Simulator ne mesure pas les FPS
sur l’iPhone de l’auteur. La livraison reste locale, sans EAS ni déploiement Fly.

Le manifeste de garde utilise `stanceMode: "guard"` et uniquement `idle` dans chaque série
d’images et d’ancrages. Le catalogue développe les sept états à la lecture, sans changer le
contrat HTTP. Les autres états dans un manifeste de garde sont refusés pour éviter des
calibrages contradictoires ; omettre ce mode conserve les poses indépendantes historiques.

Dans l’inventaire, l’aperçu équipé précède la grille des sept cases : les contrôles ne se
superposent plus au corps, à la prise ou aux palmes. Le mannequin sans avatar conserve
sa disposition historique pour les aperçus sans catalogue.

## Validation locale finale

TypeScript, lint, 553 tests client et previews:check passent. Côté backend, PHPStan,
CS Fixer, Deptrac et 1 448 tests / 30 397 assertions passent ; OpenAPI reste inchangé.
Le flow appearances passe (3 min 10 s) : choix persistés, quatre sportifs équipés,
sept états dans les deux sens, combat et retour portrait. Son attente de sortie accepte
le retour déjà effectué si le scénario court s’achève pendant le tap sur Passer.
Le contrôle ciblé d’inventaire passe avec de vrais objets achetés/équipés sur le compte QA
via les API normales. Les cases ne recouvrent plus le personnage.

Preuves sélectionnées : [vue d’ensemble des vrais calques](proofs/retro-v2-overview.png),
[atelier mobile](proofs/retro-v2-equipped.png), [combat](proofs/retro-v2-battle.png),
[grille sous le personnage](proofs/retro-v2-inventory.png).
Les contrôles utilisent le development build installé et Metro, sans reconstruction native.
Le test physique sur l’iPhone de l’auteur et les FPS restent à vérifier.
