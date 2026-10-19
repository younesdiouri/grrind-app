# Concept 3D trapu — brief G1

Direction choisie le 19 octobre 2026 : 3D trapue de jeu mobile récent, esprit Brawl Stars.
Elle remplace le MMO peint (`../flyff-3d-proposal/`). Deux images à produire, dans cet ordre ;
la seconde ne part qu'une fois la première approuvée par l'auteur.

## 1. Planche de concept → `concept.png`

Sert à valider la DA (barrière G4) : c'est l'image à laquelle le rendu Unity sera comparé.

```text
Character concept board for an original mobile 3D brawler game about sports, in the style of
modern stylized mobile hero shooters: chunky proportions about 3.5 heads tall, big head, big
hands and feet, short legs, broad shoulders, simple rounded shapes, smooth saturated materials,
clean bright lighting, soft rim light, thin dark outline. Same young adult athlete shown twice:
BASE barefoot in a plain grey tank top and navy shorts; EQUIPPED with three oversized loot items
- ivory sports goggles with golden wings on the sides and amber lenses, a navy octagonal dumbbell
with a brass grip held in the right hand, chunky navy, cream and gold sneakers. Three-quarter view,
full body, standing in a confident guard. Next to them, the three items alone. Dark navy
background with cyan accents. No text, no logos, no realistic skin pores, no painted texture
lighting, no pixel art, no chibi baby face.
```

## 2. Image d'entrée image-vers-3D → `tpose.png`

Un seul sujet, règles de `agent_skills/asset_qa/image/SKILL.md` de GameFactory-3A.

```text
The same character from the approved concept, BASE version only: barefoot, grey tank top, navy
shorts, no goggles, no dumbbell, no shoes. Front view, T-pose, arms horizontal, fingers spread
and separated, legs apart, full body visible from hair to toes, centred. Flat plain light grey
background, no floor, no shadow, no text, single character only.
```

Les objets ne se génèrent pas sur le corps : suivre les routes du skill `grrind-character-art`.

## Style peint main (19 octobre 2026, deuxième passe)

Cible : rendu 3D de jeu peint main (référence de style : Waven, jamais reproduite). Le
générateur reprend le style de son entrée : l'image doit déjà ressembler à un modèle 3D peint.

### Planche de style → `concept.png`

```text
Two full-body views (three-quarter front, and three-quarter back) of the same original young
adult athlete character for a mobile 3D tactics game, rendered as a real-time 3D game model with
hand-painted textures: stylized low-poly forms with clean simple planes, chunky proportions about
3.5 heads tall, large head, oversized mitten-like hands, big boots-like feet, short legs, broad
shoulders. Soft painted lighting from above, painted ambient occlusion in creases, soft warm
highlights, almost no outlines, no coloured rim light, no gloss. Simple sporty outfit with clear
colour blocks: grey sleeveless training top with an orange trim, navy shorts with ivory side
stripes, wrist bands, chunky navy and cream sneakers. Short dark brown hair in a few big sculpted
locks, friendly confident face with large expressive eyes. Plain white background, soft round
contact shadow under each figure. No text, no logo, no realistic anatomy or muscle striation.
```

### Entrées multi-vues → `view-front.png`, `view-back.png`, `view-side.png`

Trois images séparées, générées avec la planche `concept.png` en image de référence, pour
`multi-image-to-3d`. Même personnage, même pose, même cadrage et même échelle dans les trois ;
seule la caméra tourne autour de lui. Remplacer `<VIEW>` par la vue voulue :

- front : `strict front view, facing the camera`
- back : `strict back view, the character facing away from the camera`
- side : `strict left side profile view, the character facing left`

```text
The same character from the reference image, <VIEW>, orthographic camera at chest height,
neutral symmetrical T-pose with arms horizontal, both hands closed into big empty fists holding
nothing, legs slightly apart, full body from top of hair to shoes, identical scale and framing
in every view, centred with margin. Same hand-painted 3D game model rendering, soft neutral
painted light from above, painted ambient occlusion, no rim light, no coloured shadows.
Flat plain light grey background, no floor, no cast shadow, no text, single character.
```
