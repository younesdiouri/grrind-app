# DA facettée — feuille de style

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
- Aucune texture bruitée : des matériaux de palette unis. Exception assumée (#295) : Al Kasal
  garde sa texture peinte, posée sur un mesh facetté (`facet_skin.py`) ; la palette unie effaçait
  son visage. Les canapés, déjà en blocs de couleurs unies, restent tels quels.
- Personnages (#299) : peau, visage et coiffures facettés par décimation, rig et poids intacts.

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
