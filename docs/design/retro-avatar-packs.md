# Avatars sportifs rétro — stances et raccords V3

La [planche D](references/retro-avatars-approved.png) est la référence de style choisie.
La V1 a été rejetée pour ses raccords. La V2 a corrigé certaines bases mais a supprimé les
stances distinctes ; sa revue a aussi manqué l’ouverture du bonnet. Ces validations anciennes
ne constituent pas une approbation visuelle. La V3 est le candidat corrigé, à essayer par l’auteur.

## Construction

Quatre identités : STRENGTH_V3, RUNNER_V3, CLIMBER_V3, SWIMMER_V3. Tenue neutre, tête nue,
pieds nus, aucun objet intégré. Chaque identité possède sept vrais dessins et leurs ancrages :

| État | Intention |
| --- | --- |
| idle | Garde équilibrée |
| attack | Engagement vers l’avant, bras porteur allongé |
| hit | Recul du buste, bras libre protégeant le torse |
| critical | Fente plus profonde et poids engagé |
| dodge | Appuis abaissés, garde protectrice |
| combo | Bras porteur plus haut, autre bras revenu près des côtes |
| replay | Relance, retour du bras libre en garde haute |

Le même bras porte l’arme dans tous les états. Le poing reste vertical et hors du torse,
avec du vide au-dessus et en dessous. L’arme passe derrière le corps ; aucun patch de peau.
La tête garde une perspective proche, les pieds restent plantés. Les limites de cette animation
par poses sont assumées : elle ne simule pas une rotation libre de l’arme ou des articulations.

| Objet | Calque et contact |
| --- | --- |
| Haltère ego | hand, derrière le poing fermé |
| Lunettes de course-poursuite | eyes, devant les yeux |
| Prise de tête / Bonnet de bain de minuit | head, devant, couronne fermée sans intérieur apparent |
| Palmes académiques | footRear de face + footFront de côté, chaussons opaques |
| Cape du voyageur | shoulder, derrière les épaules et le corps |

Une seule pièce HEAD : lunettes et coiffes s’excluent. Ceinture, gourde et sac à magnésie
restent hors rendu. Leurs inventaires ne sont pas supprimés. Les anciens packs restent
inactifs mais accessibles aux replays. Les profils V2 passent à leur identité V3 sans perte.

## Fabrication et configuration

Les prompts ImageGen intégré et leurs références sont dans
[le journal V3](references/retro-v3-generation.json). Les maîtres V2 servent d’identité ;
les gardes communes rejetées et les premiers raccords ne servent pas de validation positive.
Sources locales : artifacts/artwork-v3/source/. Exports : ../grrind/public/artwork/.

1. Éditer une identité avec ImageGen, puis inspecter la logique de la pose seule. Refuser
   changement de main porteuse, pied levé incompatible, prise contre le visage ou perspective
   qui rend les objets impossibles. Corriger avant de décliner.
2. Générer l’objet seul en vrai alpha. Une coiffe ouverte vue par-dessous ne devient pas
   portable avec un simple déplacement. Corriger sa forme, puis composer les vrais calques.
3. Exporter avec scripts/prepare-retro-art.swift, mode avatar pour sept sources carrées,
   item pour un objet. Le mode guard reste historique. Grille 256², corps 512², miniatures 256²,
   alpha binaire, miroir mécanique. normalization.json peut fixer les hauteurs par pose ;
   ne pas agrandir une esquive accroupie pour lui donner la hauteur d’une garde.
4. Calibrer les six séries eyes/head/hand/shoulder/footFront/footRear sur les exports réels,
   pose par pose. Le pivot et les proportions appartiennent à l’objet. back regarde à droite,
   front à gauche : x → 1-x, rotate → -rotate, pivot.x → 1-pivot.x.
5. Composer avec scripts/render-retro-proofs.swift MANIFESTE PUBLIC SORTIE. Lire les vues
   entières et les *-details.png : chaque ligne représente idle, attack, hit, critical, dodge,
   combo, replay ; colonnes vue entière puis contact, droite puis gauche. Pour les palmes,
   deux gros plans séparés. Les *-contacts-0.png regroupent les contacts des quatre identités ;
   *-contacts-1.png montre le deuxième pied. Ordre des paires : Muscu, Course, Escalade, Natation.
6. Vérifier chaque objet seul, puis arme + pieds + cape avec chacune des trois pièces HEAD.
   Après correction, refaire une passe sur les fichiers finaux et le rendu mobile. Les tests
   de présence/coordonnées ne remplacent pas ce jugement visuel.
   Pour les lunettes, examiner séparément les branches proche et éloignée : la tête doit
   masquer l’arceau arrière et la branche opposée. Le calque porté omet ces surfaces ;
   une boucle complète de catalogue ne doit jamais traverser le front.

Le calibrage actif vit dans ../grrind/config/artwork/retro-v3.json, la migration possède sa
copie figée. Les lunettes corrigées sont en version d’équipement V4 ; les avatars restent V3.
make console c=app:artwork:import recharge ces dix packs et peut écraser un réglage
admin : exporter les modifications à conserver avant de réimporter. Nouvelle DA incompatible =
nouveaux chemins et versions ; ne pas écraser une image mise en cache dans un ancien replay.

## Aperçus et cadrage

Réglages → Ton héros permet de choisir le sportif. L’atelier de développement /avatars expose
les sept états, les deux sens et les six objets, puis un combat de démonstration.
L’inventaire conserve l’aperçu au-dessus de la grille des cases, sans contrôler par-dessus la main.

http://localhost:8080/admin/artwork compose les mêmes PNG et ancrages. « Inspecter les raccords »
ouvre chaque stance entière et ses contacts agrandis. Le CRUD « Avatars et calques » édite
images, ancrages, disponibilité et compatibilité, sans publication de règles numériques.

Le corps et les objets partagent parent et horloge Reanimated. Les sept images sont chargées
avant combat, puis affichées par opacité ; aucun bitmap n’est calculé par frame. Le cadrage
réserve la place des objets dans TOUTES les poses du même équipement, rotations comprises,
pour qu’une palme en fente ne soit pas coupée et que la taille ne saute pas entre deux états.
Le repli embarqué Muscu possède aussi sept dessins. Les archives à garde unique restent lisibles.

## Revue du candidat

[Journal de revue et preuves](retro-v3-review.md). Le contrôle statique couvre six objets seuls,
quatre identités, sept poses, deux orientations, puis trois tenues complètes selon HEAD.
Les coiffes sont fermées ; la revue a aussi corrigé des changements de main et des talons/instep
encore visibles après le premier calibrage. La grille de preuves garde une marge pour les objets.
Le test physique iPhone et la mesure des FPS restent à faire par l’auteur. Livraison locale,
sans build natif, EAS ou déploiement backend.

La revue V3 avait manqué les parties arrière des lunettes visibles à tort devant la tête.
Le verdict sur cet objet est retiré ; [correctif V4 et preuves actuelles](retro-goggles-v4-review.md).
