# Revue des stances et des raccords V3

Le style D reste approuvé ; le fitting V3 reste un candidat à essayer par l’auteur.
Cette revue remplace la conclusion trop favorable de la V2. Elle porte sur les vrais PNG
composés avec les ancrages du catalogue, puis sur le navigateur et React Native.

## Défauts trouvés et corrections

| Observation | Correction | Recontrôle |
| --- | --- | --- |
| Sept boutons V2 répétaient une seule garde | Sept dessins par identité, ancrages indépendants | Hashes distincts via l’API, silhouettes entières et parcours mobile |
| Ouverture du bonnet visible devant le front du grimpeur | Nouveau calque fermé, perspective à hauteur de tête | Tous les fronts en gros plan, inspecteur admin sur Escalade |
| Casquette d’escalade également creuse sous sa visière | Couronne fermée et visière courte | Même matrice tête/front dans les deux sens |
| Des brouillons changeaient de main porteuse sur hit/dodge/combo | Reprise des bras avec la même main à droite du buste | Vues entières puis 56 contacts poing/poignée |
| Talons et dessus de pied dépassaient encore au premier calibrage | Chausson plus enveloppant, pivot remonté, ancrages ajustés par pose | Deux pieds contrôlés séparément après correction, puis en tenue complète |
| Coiffes Muscu trop avancées sur hit/critical | Point et largeur de tête corrigés pour ces poses | Nouvelle matrice de contacts finale |
| Les fentes équipées dépassent le canevas du corps | Marges dans les preuves, cadrage app calculé sur toutes les poses du même équipement | Tests de rotation/débordement, captures natives des critiques dans les deux sens |

Les objets de taille rejetés restent hors rendu. Il n’y a plus de chaussure dans les bases,
de patch de doigts ou de gourde sans support.

## Lecture et couverture

Première passe : lecture des silhouettes, de la main porteuse et des compositions avec
chaque item. Les défauts du tableau ont été corrigés avant la passe finale.
Deuxième passe : contacts groupés des exports finaux, compositions cumulées et contrôle
dans les rendus navigateur/natif. Aucun nombre de fichiers ou test technique ne remplace
la revue visuelle.

Les matrices des objets seuls couvrent 4 avatars × 7 stances × 2 orientations = 56 contacts
par objet, soit 336 compositions pour les six objets. Les tenues complètes ajoutent les
trois alternatives HEAD avec arme, pieds et cape. Les paires de colonnes représentent
Muscu, Course, Escalade, Natation ; chaque paire montre droite puis gauche. Les lignes
sont garde, attaque, coup reçu, critique, esquive, combo, relance.

| Objet | Critère inspecté | Preuve des contacts finaux |
| --- | --- | --- |
| Bonnet de bain de minuit | Bord sur le front, absence d’intérieur apparent | [Bonnet](proofs/retro-v3-midnight_swim_cap-contacts-0.png) |
| Prise de tête | Couronne posée, visière sans ouverture creuse | [Casquette](proofs/retro-v3-headache_cap-contacts-0.png) |
| Lunettes | Verres devant les yeux, pont et branches cohérents | [Lunettes](proofs/retro-v3-pursuit_goggles-contacts-0.png) |
| Haltère ego | Même main, poing masquant la poignée, masses dégagées | [Poignée](proofs/retro-v3-halter_ego-contacts-0.png) |
| Palmes académiques | Talon, dessus et orteils enveloppés, deux perspectives | [Pied arrière](proofs/retro-v3-academic_flippers-contacts-0.png), [pied avant](proofs/retro-v3-academic_flippers-contacts-1.png) |
| Cape du voyageur | Derrière le dos/épaule et le bras, sans fragment flottant | [Épaule](proofs/retro-v3-travelers_cloak-contacts-0.png) |

Vues entières : [tenue avec lunettes](proofs/retro-v3-all.png),
[tenue avec casquette](proofs/retro-v3-all_headache_cap.png),
[tenue avec bonnet](proofs/retro-v3-all_midnight_swim_cap.png).
[Grimpeur et bonnet, vue entière + détail par pose](proofs/retro-v3-midnight_swim_cap-climber_v3-details.png).

## Rendu réel et contrôles techniques

Le navigateur local authentifié montre les sept stances avec les PNG/ancrages actifs V3.
Le bouton « Inspecter les raccords » ouvre la composition entière et les cinq contacts :
[capture réelle de l’inspecteur](proofs/retro-v3-admin-inspector.jpg).

Le flow .maestro/appearances.yaml passe en 3 min 20 s avec le development build installé,
Metro 8082, sans rebuild natif : quatre choix persistés, quatre sportifs équipés, sept états
dans les deux sens, combat et retour portrait. Captures inspectées :
[atelier](proofs/retro-v3-native-equipped.png), [critique](proofs/retro-v3-native-critical.png),
[combat](proofs/retro-v3-native-battle.png).

Un contrôle natif ciblé du bonnet du grimpeur passe aussi (46 s) :
[garde équipée](proofs/retro-v3-native-swim-cap.png) et
[critique dans l’autre sens](proofs/retro-v3-native-climber-critical-mirror.png).
Une capture intermédiaire était restée sur Muscu après un tap sous le header ; elle a été
écartée. Le contrôle final montre le bouton Escalade sélectionné et le bon personnage.
Le premier lancement ciblé était arrêté par la récompense santé du compte QA au redémarrage ;
le contrôle a repris après fermeture normale de ses pages XP/butin/série, sans changer le code.
Le rôle admin ajouté temporairement à un compte QA pour le contrôle navigateur a été retiré.

Typecheck, lint, 556 tests client et previews:check passent. Côté backend : PHPStan,
CS Fixer, Deptrac et 1 449 tests / 31 532 assertions passent ; OpenAPI ne change pas.
Le test API vérifie aussi qu’un calibrage admin d’attaque laisse la garde intacte et que
les poses publiées ne répètent pas une même image. Le test de cadrage couvre un objet
qui déborde en fente et une rotation autour du pivot.

## Limites explicites

Animation par poses, tête de perspective proche et prise verticale : les armes futures
doivent respecter cette famille ou recevoir une famille explicite. Pas de promesse de
rotation libre des articulations. Les queues de cheval/chignons et mèches restent visibles
hors de la couronne des coiffes stylisées ; aucun pixel de cheveu ne doit traverser sa matière.
Les figures et objets conservent leur style rétro plutôt qu’une simulation textile.

Le Simulator ne prouve pas les FPS ni le rendu physique de l’iPhone de l’auteur. Ces deux
points restent à essayer sur son appareil. Aucun déploiement EAS/backend n’a été réalisé.
