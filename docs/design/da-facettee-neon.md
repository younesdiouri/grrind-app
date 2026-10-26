# DA facettée néon — feuille de style

Fixée par le pilote #281 (baskets athlète) ; l'éclairage vient de #280. Elle s'applique à tout ce
qu'on ajoute au combat : équipement, armes, mobs, décor.

## Règle

Les facettes vont dans **l'équipement, la lumière et le décor**, jamais sur la peau ni les visages.
Un personnage reste un corps Quaternius lisse ; ce qu'il porte est taillé.

## Défaut d'un combattant

Sans équipement serveur : t-shirt sport **blanc**, jogging **ardoise**, baskets facettées. Les
objets gagnés se voient par contraste : t-shirt ardoise ou corail, leggings Guinzz, armes.
Plus de tenue Peasant (« pas finie », hors DA) ni de pieds nus.

## Géométrie

- Low-poly à la main dans Blender, script versionné dans `spikes/art-source/<objet>/`.
- Arêtes vives, **un seul biseau** de 3 mm (`segments = 1`, limite d'angle ~35°) : la lumière
  accroche le chanfrein, l'objet ne devient pas une goutte arrondie.
- Shading plat, normales par face. Budget : ~600 triangles par chaussure, ≤ 2 000 par objet tenu.
- Aucune texture bruitée : des matériaux de palette unis. Les props Meshy existants restent tels
  quels jusqu'à leur reprise (Al Kasal, canapés : ticket séparé).

## Palette

| Rôle | Couleur |
|---|---|
| Base claire (semelle, t-shirt) | `#E6EDF2` |
| Ardoise (jogging, renforts) | `#333D4D` / `#525E75` |
| Nuit (tige, structure) | `#1A1F30` |
| Néon joueur / accent | cyan `#35E4FF` |
| Équipes du HUD | menthe `#75FFB2`, rose `#FF5ACD` — réservées au HUD |

## Émissif

- Une **bande** néon par pièce, pas un liseré partout : sur la semelle d'une chaussure, le long du
  tranchant d'une arme, sur l'arête maîtresse d'une épaulière.
- Matériau à part (`Neon`) avec `_EmissionColor` au-dessus du seuil de bloom (1,3) : couleur × 4.
  Le bloom de l'arène fait le halo, le shader ne l'imite pas.
- Pas de rim coloré d'équipe sur les corps : essayé en #280, refusé sur iPhone.

## Métal

MatCap or ou acier (`ToonMaterials.Metal`) avec masque tiré de la texture. Le métal reste
réservé aux objets qui en sont.
