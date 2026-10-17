# Avatars sportifs rétro

Direction validée : [planche D](references/retro-avatars-approved.png). Cette image est
la maquette de style ; les PNG livrés sont des corps et objets réellement séparés.
L’interface GRRIND conserve ses couleurs, sa typographie et ses cadres techniques.

## Essayer en local

Dans Réglages → Ton héros, choisir Muscu, Course, Escalade ou Natation. Le choix est
sauvegardé par PATCH /api/me et utilisé dans l’inventaire, les prochains combats et le
profil public. Les anciens combats conservent leur identifiant d’apparence.

Dans le development build, Réglages → Atelier des avatars montre les quatre avatars,
les sept poses, les deux orientations et tous les objets. On peut lancer une démonstration
avec la sélection. Cet atelier n’ajoute rien à l’inventaire et n’accorde aucune récompense.
Les huit objets cosmétiques sont aussi disponibles pour une pièce en boutique locale pour
vérifier le vrai parcours achat → équipement → inventaire → combat, sans équilibrage ajouté.

Backend local : http://localhost:8080/admin/artwork (session administrateur).
La page montre les sept poses composées et propose l’import de PNG. Le menu
« Avatars et calques » permet de créer/modifier nom, disponibilité, ordre, chemins,
ancrages, plans, pivots et compatibilités. Les paramètres de jeu de l’objet restent dans
le catalogue des items ; modifier un pack graphique ne publie pas un brouillon de balance.
Un PNG importé renvoie son chemin /game-images/<hash>.png à placer dans le manifeste.

| Objet | Emplacement | Ancrage |
| --- | --- | --- |
| Haltère ego | WEAPON | hand |
| Lunettes de course-poursuite | HEAD | eyes |
| Ceinture de force tranquille | ACCESSORY | waist |
| Gourde à tout faire | ACCESSORY | hip |
| Prise de tête | HEAD | head |
| Sac à génie | ACCESSORY | hip |
| Bain de minuit | HEAD | head |
| Palmes académiques | FEET | footRear + footFront |

Une seule pièce par emplacement du jeu. Les lunettes et coiffes s’excluent ; les
accessoires de ceinture également. Le nom canonique traduit d’un objet se règle dans
le catalogue des items ; le nom du pack sert à sa présentation dans l’atelier.

## Contrat graphique

Le backend grrind-back, localement ../grrind, possède les exports sous public/artwork/.
Le fichier config/artwork/retro-v1.json contient les douze packs et leur calibrage.
Les clés d’avatars incluent la version : STRENGTH_V1, RUNNER_V1, CLIMBER_V1, SWIMMER_V1.
Une nouvelle silhouette incompatible reçoit une nouvelle clé/version. Pour un item,
les combats figent key + artworkVersion : conserver ses anciennes versions dans le catalogue.
Désactiver un pack le retire des nouveaux choix, sans le retirer des replays.
S’il existe plusieurs versions actives d’un même item, la plus récente est prioritaire ;
il est préférable de désactiver la précédente pour rendre l’atelier sans ambiguïté.
Ne pas remplacer les fichiers d’une version déjà utilisée par une DA incompatible.

Les poses sont idle, attack, hit, critical, dodge, combo et replay. back regarde à droite,
front à gauche : ces termes historiques désignent une orientation de combat, pas une vue
caméra de dos/de face. Les vues gauches du pack v1 sont des miroirs mécaniques.

Grille de travail 256², corps exportés 512² par agrandissement entier sans interpolation,
miniatures 256². Alpha binaire. Les objets sont recadrés sans marges, avec un pivot exprimé
dans leur propre image. Les ancrages x/y/span/rotate appartiennent à chaque avatar/pose.
Pour la vue miroir : x devient 1-x, rotation devient -rotation et pivot.x devient 1-pivot.x.
Les objets conservent leurs proportions ; leur échelle peut varier avec le raccourci d’une pose.
La palme arrière utilise la source et le pivot miroirs du pied avant pour suivre le pied ouvert.

Ordre de rendu : objets derrière → corps → objets devant → masque des mains. Le masque
foregroundUrls est un extrait mécanique des pixels de la main du corps, aux mêmes coordonnées.
Il laisse la poignée dans la paume et les doigts devant, y compris sur le torse pendant
l’esquive. Il ne contient aucun pixel inventé dans le calque de l’objet. Le supprimer quand
on retire tous les objets n’altère pas l’avatar.

## Reproduire une génération

Le skill personnel grrind-art-direction contient la direction et le contrat de calques.
Les 36 briefs exacts sont dans [le journal de génération](references/retro-v1-generation.json).
Les sources de cette session sont conservées dans artifacts/imagegen/retro-v1-source/ :
quatre idles maîtres, six dérivations par identité, huit objets seuls. Les sorties prêtes
à jouer sont versionnées dans le backend ; le client embarque un repli Muscu.

1. Générer avec ImageGen intégré depuis la planche validée ; chaque pose dérive de son idle
   maître. Conserver tenue, visage, silhouette, lumière et mains vides.
2. Générer chaque objet seul, en alpha réel, dans la perspective de la référence. Son icône
   est issue du même dessin ; aucun personnage ni main ne sont peints dans l’objet.
3. Normaliser avec scripts/prepare-retro-art.swift : mode avatar SOURCE DEST ou item SOURCE DEST.
   Ce script recadre, aligne, durcit l’alpha, exporte et reflète ; il ne redessine rien.
4. Définir les ancrages sur les exports finaux. Exécuter scripts/prepare-retro-foreground.swift
   MANIFESTE PUBLIC pour les masques de prise. Si une nouvelle main déborde son masque,
   corriger sa découpe avant de valider ; le rectangle v1 n’est pas un détourage universel.
5. Exécuter scripts/render-retro-proofs.swift MANIFESTE PUBLIC SORTIE [ITEM_KEY]. Chaque objet
   produit 56 compositions : quatre avatars × deux orientations × sept poses. Les colonnes
   sont Muscu droite/gauche, Course droite/gauche, Escalade droite/gauche, Natation droite/gauche ;
   les lignes suivent l’ordre des sept poses ci-dessus. Inspecter les 448 compositions.
6. Réimporter le calibrage local côté backend : make console c=app:artwork:import. La migration
   contient son propre manifeste initial figé ; ne pas modifier une migration déjà publiée.
7. Vérifier le flow mobile existant .maestro/appearances.yaml et ses captures sur le binaire
   installé, sans reconstruction native. Observer aussi le résultat à la taille réelle sur iPhone.

## Chargement et limites de mesure

Les corps, objets et masques partagent le même parent et la même horloge Reanimated.
Les sept poses sont préparées avant le combat ; aucune composition bitmap ou requête ne tourne
à chaque frame. Les aperçus statiques ne montent que leur pose. Un accessoire en échec est omis,
un corps/masque indisponible signale une illustration indisponible. Les versions et sources
sont mises en cache ; les données du catalogue deviennent périmées après une minute.
Le pack serveur complet occupe environ 6 Mo compressés. La taille PNG ne mesure pas la mémoire
RGBA décodée et aucun chiffre de FPS sur iPhone n’est revendiqué par cette livraison locale.

L’ancienne DA Murīd et le prototype bandeau ont été retirés des deux dépôts. Les profils
Murīd existants passent au Muscu ; la lecture des snapshots historiques possède le même repli.
Progression, séances et inventaires existants sont conservés. Pas de réinitialisation de base,
de modification des monstres, de livraison EAS ou de déploiement de production dans ce périmètre.

## Validation locale du 17 octobre 2026

Les 448 compositions indépendantes ont été inspectées ; l’haltère a reçu un calibrage
de rotation/prise et les palmes deux orientations distinctes pour les pieds ouverts.
Le flow existant appearances passe sur le binaire installé : quatre choix sauvegardés,
quatre sportifs équipés, les sept poses dans les deux sens, combat, Passer et retour portrait.
Un contrôle complémentaire a acheté puis équipé l’haltère via l’interface réelle ; le profil
Natation sauvegardé apparaît bien dans l’inventaire. Les cases Torse et Pieds ont été déplacées
pour ne plus cacher le corps et les palmes. Les captures finales sont conservées :
[équipé vers la droite](proofs/retro-equipped-right.png),
[équipé vers la gauche](proofs/retro-equipped-left.png),
[inventaire équipé](proofs/retro-inventory-equipped.png).

TypeScript, lint et 553 tests client passent, ainsi que previews:check et api:check.
Le backend passe make qa et la suite complète de 1 444 tests ; le correctif de calibrage
ajoute ensuite un test d’orientation des palmes, validé avec le parcours API des apparences.
L’essai sur l’iPhone de l’auteur et la mesure de FPS restent à faire.
