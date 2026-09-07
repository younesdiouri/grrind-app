# Al-Kasal — sprites du prototype

Trois PNG RGBA de 1024 × 1024 pixels, sans décor ni damier. Environ 2,9 Mo au total.

Les poses ont une échelle anatomique commune. Elles sont placées sur un canevas de 1374 × 1374
avant réduction à 1024 : la ligne de sol des pixels opaques est à 1250, soit environ 932 pixels
en sortie. La pose d’attaque est décalée de 45 pixels vers la gauche avant réduction pour
rapprocher son bassin de la position de repos. La pose touchée conserve son inclinaison.

La pose de repos a été validée par l’utilisateur. Attaque et coup reçu ont été générés avec
ImageGen intégré, en utilisant le PNG de repos comme référence. L’outil ayant peint un damier,
le détourage a été réalisé localement avec l’accord explicite de l’utilisateur : suppression du
fond clair neutre, estimation de l’alpha et des couleurs de bord, retrait d’un pixel du contour
pour enlever la frange blanche. Les fichiers sources sont conservés dans `output/imagegen/`
sur le poste de travail ; les fichiers de ce dossier sont les livrables consommés par Metro.

## Prompts ImageGen

Attaque :

> Edit reference into ONE ATTACK POSE sprite for the exact same Al-Kasal monster. Preserve identity exactly: indigo rock body, ragged heavy hood mantle, large rounded nose, tired violet eyes, squat legs, huge long arms, proportions, hand painted style, cyan rimlight. Same front three-quarter camera, same square canvas, same anatomical scale, same feet baseline and approximate pelvis position. Pose: torso twists slightly and leans into a brutal heavy forward downward swipe, one thick arm drawn forward across lower torso with open claw-like fingers aimed toward viewer, other arm counterbalances to side. Strong readable attack silhouette distinctly different from idle; keep his lethargic heavy personality. Full body entire hands and feet within frame with clear margins. Genuine transparent alpha background. No scenery floor text UI particles impact effects shadows under feet or motion trails. One single sprite only.

Coup reçu :

> Edit the reference into ONE HIT REACTION POSE sprite of exactly the same Al-Kasal for a mobile RPG. Preserve exactly creature design, large rounded nose, heavy rock indigo limbs and belly, layered ragged hood/mantle, short thick legs, hand painted rendering cyan rimlight violet eyes. Same front three-quarter view, anatomical scale and square frame as reference, same feet baseline near bottom. Pose: recoiling from a blow to chest, upper body leaning backward and slightly sideways, head tipped back, eyes squinting with annoyed grimace, arms lifted away from body with loosely curled fingers, bent knees absorbing impact. Distinct readable silhouette from hanging-arm neutral, body remains massive and heavy. Entire body hands feet inside canvas with clean margins. Genuine transparent alpha background; no checkerboard pattern or background pixels. No scenery, floor, baked ground shadow, text, UI, impact streaks or particles. One character, one pose only.
