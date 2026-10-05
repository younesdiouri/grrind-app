# Direction des combats — Murīd et arènes

Décision utilisateur : duel automatique en paysage plein écran, combattants latéraux face à
leur adversaire. Ālam al-Nafs : carte surélevée en perspective isométrique. Le serveur décide
les actions et le résultat ; ces images et animations ne font que les rejouer.

## Murīd

Identité validée : jeune voyageur à peau brune, capuche et cape bleues, ceinture ocre, lame
courte au fil cyan. Rendu peint dans le style d’Al-Kasal. Les concepts frontaux du brief
initial servent à l’identité et aux couleurs ; la correction utilisateur remplace leurs poses.

Le contrat API conserve ses noms : `back` désigne le joueur à gauche, regardant vers la droite ;
`front` désigne l’adversaire à droite, regardant vers la gauche. Aucun personnage ne regarde
la caméra. Les miniatures `thumb/front` servent aux participants du raid.

Livrables : `heroes/murid/{back,front}/{idle,attack,hit}.png`, PNG RGBA 1024 × 1024, alpha réel,
semelles solides à 930 px. Miniatures de raid : `heroes/murid/thumb/front/*.png`, 256 × 256.
Sources pleine taille et deux jeux de miniatures également dans `~/Desktop/murid-imagegen/out/`.
La livraison serveur `public/appearances/murid/v2/` attend la validation des poses latérales.

### Jeu de prompts final pour reproduire les poses

Références : identité Murīd validée et `style-reference/al-kasal-idle.png` du dossier de brief.
Éditer la pose latérale de repos correspondante pour ses variantes.

> Paint ONE full-body sprite of exactly the approved Murid. Preserve his identity: young lean
> warm-brown-skinned adventurer, deep blue cloak #24456B, lighter hood #2C5582, warm ochre sash
> #C9A46A, slate tunic, wrapped forearms, leather boots, short straight sword with thin cyan
> edge and cyan rimlight #46E0F0. Rich hand-painted rendering, refined cloth folds, readable
> silhouette. Fighting-game side view, facing [DIRECTION], eyes on the opponent, never at the
> camera. Same anatomical scale and approximate pelvis position across all three poses. ONE
> pose: [POSE]. Entire body and sword inside the square frame with generous clean margins.
> Feet baseline about 91% of the height. Genuine transparent alpha background. No scenery,
> floor, ground shadow, checkerboard, text, UI, particles, halo or motion trail.

| Fichier | DIRECTION | POSE |
| --- | --- | --- |
| back/idle | right | Alert fighting guard, knees bent, sword ready toward the opponent |
| back/attack | right | Horizontal forward sword lunge, forward knee bent, cloak flowing behind |
| back/hit | right | Recoil away from an incoming blow on the right, torso leaning left, feet planted |
| front/idle | left | Alert fighting guard, knees bent, sword ready toward the opponent |
| front/attack | left | Horizontal forward sword lunge, forward knee bent, cloak flowing behind |
| front/hit | left | Recoil away from an incoming blow on the left, torso leaning right, feet planted |

Recalage technique après ImageGen : `sips`, sans modifier le dessin. Mise à l’échelle,
padding transparent, cadrage 1024 × 1024, puis miniatures `sips -z 256 256`.

## Arènes

### arenas/duel.png

> Hand-painted fantasy fighting-game arena, widescreen side-on view. Refined sandstone
> courtyard at golden dawn, distant mountain valley and waterfalls, arches and columns at
> the lateral edges. Broad continuous horizontal empty fighting floor in the foreground,
> enough clear space for two full-body combatants on one baseline. Deep blue shadows,
> restrained cyan accents, warm ochre highlights, detailed painterly rendering matching
> Murid and Al-Kasal. No characters, interface, text, logo or watermarks.

### arenas/alam.png

> Hand-painted fantasy courtyard seen from an elevated isometric camera, like a 2D tactical
> RPG map. Square composition, indigo sandstone tiled floor with readable diagonal tile
> grid, ruined stone pillars at the edges, restrained cyan magical gate in the upper corner,
> warm ochre vegetation. Open playable floor, space for a boss in the upper-left and heroes
> in the lower-right and upper-right. Refined painterly detail, same visual world as Murid
> and Al-Kasal. No sky, horizon, characters, interface, text, logo or watermarks.

## Poses spécifiques — critique, esquive, combo, relance

Retour utilisateur : supprimer les annonces centrales et conserver les dégâts auprès de la
cible. Les quatre images de `combat-effects/` sont réutilisées sur le combattant concerné.
Les variantes ci-dessous complètent les trois poses du catalogue sans modifier le contrat
serveur. Un modèle qui n'en possède pas garde ses poses de base.

Livrables supplémentaires : `heroes/murid/{back,front}/{critical,dodge,combo,replay}.png`,
1024² RGBA, même ligne de sol à 930 px. Copies et miniatures 256² dans le dossier `out/`
du brief. Génération avec l'outil ImageGen intégré, en édition de la garde latérale correspondante.

Prompt commun :

> Use case: identity-preserve. Asset: ONE game sprite, [POSE] pose. Edit the attached Murid
> side-view idle reference into this single new pose: [DESCRIPTION]. Preserve EXACT identity,
> face, proportions, blue hood and cloak, ochre sash, slate tunic, wrapped forearms, boots,
> short straight sword, cyan rimlight and refined hand-painted rendering. Side-on fighting
> game view facing [DIRECTION], looking at the opponent, never at the camera. Entire full body
> and sword inside a square 1024 x 1024 frame with generous unclipped margins. Same anatomical
> scale and pelvis position as reference; both solid feet baseline near y=930. Genuine
> transparent alpha. No background, floor, shadow, effects, particles, motion trails, halo,
> text or UI. One character, one pose only.

DIRECTION : right pour `back`, left pour `front`.

- **critical** : A powerful decisive overhead diagonal sword strike toward the opponent, front knee deeply bent, torso committed forward, blade angled downward from above the shoulder. Clearly more forceful than a normal horizontal thrust.
- **dodge** : A nimble low evasive lean away from the opponent: knees deeply flexed, torso shifted backward while eyes stay on the opponent, sword held close low beside the body. Feet remain on the ground. Clearly dodging rather than injured.
- **combo** : A fluid follow-through sweeping sword cut at waist level toward the opponent, torso rotated dynamically, rear heel raised, cloak fanning behind. Clearly a flowing chained attack, distinct from both the normal straight thrust and overhead critical.
- **replay** : A quick renewed attack stance after a sidestep: compact low forward step toward the opponent, sword in a tight rising diagonal cut, free hand pulled back, cloak curled around the rear shoulder. Energetic controlled second strike, distinct from wide combo sweep.
