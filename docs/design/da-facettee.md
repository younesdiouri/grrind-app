# DA facettée — feuille de style

Source de vérité actuelle pour le combat : style fixé par #281, personnages facettés depuis
#299/#304, éclairage #280. Elle s'applique aux personnages, équipements, armes, mobs et décors.
Les captures récentes de l'app et les concepts approuvés de l'item priment sur les anciennes
planches. Le workflow est dans `.claude/skills/grrind-character-art/SKILL.md`.

## Règle

Personnages Quaternius, peau, visage, coiffures, équipements et décors ont des **facettes
lisibles et des masses simples**. Préserver l'anatomie, le rig et les choix d'apparence existants.
Le personnage porte des pièces amovibles ; aucun équipement peint dans son corps de base.

Références récentes : `docs/design/moumoutivation/unity-male.png` et
`docs/design/moumoutivation/unity-female.png`
pour les têtes et la laine ; `docs/design/sword-guard/ios-inventory-preview-huilesson-male.png`
pour l'avatar équipé dans l'app. Chaque référence guide seulement les parties qu'elle montre.

## Défaut d'un combattant

Sans équipement serveur : t-shirt sport **blanc**, jogging **ardoise**, baskets facettées. Les
objets gagnés se voient par contraste : t-shirt ardoise ou corail, leggings Guinzz, armes.
Plus de tenue Peasant (« pas finie », hors DA) ni de pieds nus.

## Géométrie

- Low-poly construit dans Blender ou généré depuis un concept déjà dans cette DA, puis ajusté
  avec un script versionné dans `spikes/art-source/<objet>/`.
- Pour les pièces dures construites dans Blender : arêtes vives et biseau simple. Le réglage
  des baskets (#281), 3 mm et un segment, est une référence locale à adapter aux dimensions.
  La laine de la Moumoutivation utilise des touffes anguleuses, sans biseau imposé.
- Shading plat, normales par face. Budget : ~600 triangles par chaussure, ≤ 2 000 par objet tenu.
- Matières simples, sans bruit ni microtexture. Préférer la palette unie ; conserver une texture
  peinte sobre lorsqu'elle porte les couleurs de l'objet (Moumoutivation, armes) ou l'identité
  du personnage (Al Kasal, #295), avec la lumière traitée dans Unity.
- Personnages (#299) : peau, visage et coiffures facettés par décimation, rig et poids intacts. Variantes de visage et de nez en shape keys, coiffures neuves en low poly direct (#304).

## Palette

| Rôle | Couleur |
|---|---|
| Base claire (semelle, t-shirt) | `#E6EDF2` |
| Ardoise (jogging, renforts) | `#333D4D` / `#525E75` |
| Nuit (tige, structure) | `#1A1F30` |
| Équipes du HUD | menthe `#75FFB2`, rose `#FF5ACD` — réservées au HUD |

## Pas de néon

Essayé sur la semelle des baskets (#281) : invisible au cadrage du combat sur l'arène d'hiver, et
l'auteur n'en voit pas l'utilité dans cette DA. Pas d'émissif sur l'équipement ni les armes ; les
accents passent par la couleur unie et le biseau. Pas de rim coloré d'équipe non plus (refusé en
#280) : menthe et rose restent au HUD.

## Métal

MatCap or ou acier (`ToonMaterials.Metal`) avec masque tiré de la texture. Le métal reste
réservé aux objets qui en sont.
