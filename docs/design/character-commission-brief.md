# Commande d'un personnage de base — cahier des charges

Pourquoi : #214 et #219 ont montré que la génération (Meshy) dérive d'un avatar à l'autre et
ne donne pas un corps fini ; les packs du store sont chers ou non vérifiés. Un artiste fait
**le corps de base modulaire** ; l'IA garde les objets, les mobs, les animations et les
variantes (skill `grrind-character-art`).

## Avant de commander

- **Il faut une référence de DA néon futuriste validée (G0).** L'artiste a besoin d'une planche :
  la faire faire par lui (étape 1 ci-dessous) ou la générer et la valider avant.
- **Choisir l'artiste sur des preuves de jeu**, pas sur des rendus : wireframes, captures dans
  Unity ou Unreal, personnages stylisés déjà livrés riggés Humanoid. Méfiance envers les offres
  très bon marché « fully rigged » : souvent un modèle généré ou assemblé.
- **Lui écrire avant de commander** (scope custom), avec ce cahier en pièce jointe.
- Fourchette observée sur Fiverr (annonces, octobre 2026) : 200 à 600 $ pour un personnage
  stylisé texturé et riggé. Prévoir le second corps (femme) comme une commande séparée.

## Paiement par jalons, chacun validé sur une capture

1. Planche de design (face, profil, dos) dans la DA ci-dessous.
2. Blockout 3D : silhouette et proportions, sans détail.
3. Modèle final + UV.
4. Textures.
5. Rig + skinning, test d'animation.

À chaque jalon, on compare au jalon validé précédent. Un défaut de proportions se corrige au
blockout, jamais après les textures.

## Texte à envoyer (anglais)

```text
Game-ready stylized 3D base character for a mobile sports RPG (Unity 6, URP, iOS).

ART DIRECTION
- Neon futuristic: clean stylized forms, crisp readable silhouette at small screen size, smooth
  finished surfaces (not hand-painted, not photoreal). Dark navy/steel palette with cyan accent
  lines that glow (emissive) under bloom.
- Young adult athlete, sporty proportions slightly stylized (big readable hands and feet).
- Base outfit: fitted sleeveless training top, shorts, simple sneakers.

MODULARITY (most important)
- One shared skeleton for everything. Separate skinned meshes, each swappable on its own:
  head, hair, torso/top, hands, legs/shorts, feet/shoes.
- Bare body parts under each clothing piece, or hidden-surface masking, so swapping a piece never
  shows holes or skin poking through.
- Sockets (empty bones) for: right hand grip, left hand grip, head accessory (goggles/visor),
  back.

TECHNICAL
- Unity Humanoid-compatible rig (Mixamo naming welcome), T-pose, Y-up, metres, 1.70 m tall,
  scale 1, no stray transforms. Full finger bones (hands must close on a held item).
- Max 4 bone influences per vertex, clean weights at shoulders, wrists, knees, ankles.
- Budget: base character with base outfit <= 20,000 triangles; one LOD at about 50 %.
- Textures 2048 max per material: base colour, normal, a mask (metal/smooth/AO) and an emissive
  mask for the glowing lines. Few materials (ideally one per swappable group).
- Clean quad-based topology following deformation, no n-gons in deforming areas.

DELIVERABLES
- FBX per part plus a full assembled FBX, textures (PNG), and the source file (.blend or .max/.ma).
- Turnaround renders (front, side, back, 3/4) and wireframe screenshots.
- A short test showing the rig with one walk or punch animation.
- Full commercial rights for use in a published mobile game, and the source files.
- Milestones: design sheet, blockout, final model + UVs, textures, rig. Approval at each step.
```

## Recette à la livraison (notre vérification)

- Import Unity : avatar Humanoid valide, 1,70 m, échelle 1, aucun avertissement de rig.
- Un clip Meshy ciblé en Humanoid sur ce squelette joue sans déformation : poings, épaules,
  pieds au sol.
- Chaque pièce se masque et s'échange sans trou ; un objet tenu reste dans la main sur les sept
  gestes du combat.
- Budget triangles et textures respecté ; rendu néon (émissif + bloom) capturé à la résolution
  de l'iPhone, comparé à la planche validée (G4 du skill).
