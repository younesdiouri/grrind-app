# Cailloux dans la Chaussure

Clé du catalogue : `SAND_JACKAL` (adversaire existant conservé).

Trois PNG RGBA de 1024 × 1024 : `idle.png`, `attack.png`, `hit.png`.
Même échelle de réduction (953 / 1254), centrage horizontal et pieds opaques à y=931.

## Création — 7 septembre 2026

Images générées avec ImageGen. Direction artistique : petit golem de basalte gris,
silhouette trapue, tête et torse fusionnés, yeux et fissures ambre, éclairage de contour
cyan, illustration peinte de fantasy sombre. Personnage entier,
sans accessoires, texte, décor ni ombre au sol.

Pose de repos utilisée comme référence pour les variantes : attaque avec un coup de
poing vers la gauche de l’image ; coup reçu avec recul du corps et bras écartés.
Conserver visage, volumes rocheux, proportions et éclairage de la référence.

Sources originales conservées dans `output/imagegen/pebble-{idle,attack,hit}-source.png`.
Repos : transparence native. Attaque et coup reçu : damier opaque supprimé par script
local autorisé. Masque du fond neutre clair connecté au bord (minimum RGB > 200,
amplitude RGB < 35), érosion d’un pixel et bord adouci à 0,35 pixel ; intérieur du
personnage conservé. Inspection visuelle des trois poses sur fond sombre.

## Contenu publié dans l’administration locale

- FR : « Un tout petit caillou… et te voilà déjà prêt à abandonner ? »
- EN : “One tiny pebble… and you’re ready to give up already?”
- Nom EN : “Pebble in the Shoe”.
- Statistiques et récompenses existantes conservées.

Les PNG sont téléversés dans l’administration, puis servis par `imageUrls` de l’API.
Ils ne sont pas importés statiquement par le composant de combat.

Le combat Cailloux utilise désormais son modèle Unity par clé `SAND_JACKAL`.
Les images de ce dossier servent encore aux scénarios HTTP génériques de
`scripts/combat-presentation-server.mjs` (chargement, échec et délai des illustrations).
