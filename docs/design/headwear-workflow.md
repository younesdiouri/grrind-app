# Équipements par calques — premier bandeau

Objet existant : `TEMPERED_HEADBAND`, emplacement `HEAD`, « Bandeau trempé ».
Confirmé dans le catalogue local en lecture seule le 17 octobre 2026 ; son icône serveur
était encore `placeholder.png`. L’icône et le calque générés sont livrés dans
`assets/images/items/tempered-headband/v1/`.

## Séparer le personnage et l’objet

Les quatorze sprites originaux de Murīd restent les images du corps. Le bandeau est une
image transparente indépendante de 512 × 186 px. Il est superposé au personnage, sans
Murid équipé précomposé et sans nouvelle image du héros pour chaque combinaison d’items.

`fighterAttachments.ts` calibre une fois les points de tête du Murīd actuel, pour ses
sept stances dans les deux orientations. Ces points appartiennent au personnage : les
prochaines coiffes les réutilisent. `equipmentArtwork.ts` place le pivot propre à l’objet
sur cet ancrage, avec son échelle, sa rotation et son éventuel miroir. Le renderer accepte
un plan devant ou derrière le corps. Ajouter une cape demandera un point d’attache de dos
commun et le branchement d’un autre emplacement, pas des sprites de Murīd × chaque coiffe ×
chaque cape. Ce premier lot implémente HEAD seulement.

Ce bandeau symétrique sans texte réutilise un même calque en miroir pour l’autre orientation.
Un item asymétrique ou un changement de perspective pourra avoir plusieurs vues dédiées :
ce seront toujours des images de l’item seul. Ne pas multiplier les vues si une transformation
conserve correctement son identité et son volume.

La capuche est déjà peinte dans les sprites actuels : ce prototype porte le bandeau autour
d’elle. Un chapeau qui doit remplacer la capuche exigera une base de Murīd compatible, sans
couvre-chef dessiné, préparée une seule fois et réutilisée entre tous les HEAD. Les masques
et plans d’occultation appartiendront aussi au personnage, pas à chaque combinaison d’objets.
Ne pas prétendre qu’une superposition efface une capuche peinte dans le bitmap.

## Workflow de génération

1. Choisir l’objet réel et ses références. Générer une icône distincte, puis un calque de
   l’accessoire seul dans la perspective de Murīd. Demander un vrai alpha et refuser tête,
   corps, cheveux, capuche, décor, ombre au sol, texte et VFX. Prompts et sources :
   `assets/images/items/tempered-headband/v1/generation.json`.
2. Recadrer les marges transparentes et réduire l’asset au besoin du rendu, sans redessiner
   son contenu. Conserver le ratio, puis enregistrer le pivot, l’échelle et le plan dans
   sa fiche d’illustration. Le pivot doit être commun entre variantes d’un même objet.
3. Calibrer les ancrages du héros une fois, puis inspecter une nouvelle coiffe sur les
   quatorze poses. Si une pose de Murīd change, mettre à jour ses ancrages/version plutôt
   que retoucher les 200 items. Vérifier aussi la surface carrée réelle du sprite dans un
   conteneur rectangulaire : les pourcentages du calque doivent viser le même canevas que
   l’image contenue, et pas l’écran entier.
4. `combat-demo?head=tempered&view=back`, puis `view=front`, affichent les poses avec le
   calque. « Jouer une victoire » lance le combat contre Cailloux ;
   `scenario=duel&at=3500&head=tempered` vérifie les deux côtés du PvP. Ces routes sont dev.

## Animation et coût

Le calque est enfant du même parent animé que le corps : il hérite de respiration, élan,
recul, rotation et zoom. Son ancrage local utilise la même pose dérivée de la même horloge.
Il reste synchronisé en ×2, après Passer et avec Réduire les animations. Aucun rendu React,
chargement d’image ni composition bitmap par frame. Les images sont prêtes avant le départ ;
un accessoire en échec ou trop lent disparaît sans empêcher le corps prêt de combattre.

Un calque 512 × 186 RGBA représente environ 0,36 Mio avant les autres coûts, réutilisé sur
les sept poses ; seules les illustrations des objets présents sont montées, jamais le
catalogue complet. Le redimensionnement précoce d’Expo Image reste actif. Mesurer préparation,
mémoire et temps de frame sans/avec équipement sur le même iPhone après chauffe avant une
livraison de production ; les captures Simulator ne garantissent pas 60 i/s sur appareil.

Contrôle iOS du 17 octobre 2026 : les quatorze poses ont été inspectées, puis le duel
[avec les deux calques](proofs/headwear-layer-pvp.png). La fixture réseau longue vérifie
×2, Passer et le retour au récapitulatif. Le flow `.maestro/headwear-art.yaml` attend le
serveur local `node scripts/combat-presentation-server.mjs` ; il ne crée aucun compte.

## Dépendance backend

L’inventaire réel n’est pas encore branché : le combat actuel ne transporte aucune coiffe.
La démonstration ne prétend pas que le joueur possède ou équipe cet objet.

Le complément minimal côté back doit figer l’objet HEAD et sa version d’illustration dans
les snapshots JSONB du joueur et du défié PvP. Création et lecture doivent servir la même
référence. Un retrait/remplacement affecte les prochains combats ; un replay ne relit jamais
l’inventaire courant. Les anciens combats, les objets inconnus et les versions incompatibles
conservent le héros normal. Conserver les anciennes images et versions d’ancrages utilisées.

Générer le contrat officiel côté back puis le tirer (`api:pull` / `api:generate`), sans DTO
API inventé dans le front. `grrind-back#295` ne fournit pas ce contrat d’équipement à lui seul.
`AGENTS.md` exige une autorisation explicite avant de modifier ce dépôt : aucune modification,
migration ou réinitialisation du back n’a été faite pour ce prototype.

Sources consultées : docs Expo SDK 57 Image et React Native 0.86 Transforms
(https://reactnative.dev/docs/0.86/transforms#transform-origin).
