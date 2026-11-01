# #330 — Cailloux lisible et ancré

Ticket : https://github.com/younesdiouri/grrind-app/issues/330

La capture de l’auteur montre une garde qui cache le visage, une attente presque
immobile et une attaque qui semble marcher. Deux supporters applaudissent en croisant
les avant-bras au-dessus de la tête après retargeting.

## Proposition pour l’essai iPhone

- Abaisser et ouvrir le poing côté caméra ; conserver le bloc de pierre rigide.
- Balancer doucement le torse et décaler les deux poings pendant l’attente.
- Armer, frapper au contact canonique 0,5, tenir brièvement l’impact et revenir à la garde.
  Le combo enchaîne deux gestes ; le contre conserve sa parade.
- Rapprocher Cailloux de 25 cm et supprimer l’approche pendant ses frappes : les pieds
  sont fixés dans les clips et dans le placement de l’arène.
- Remplacer `StandingClap` par `StandingFistPump` ou `TwoFistsCheer` aux mêmes places,
  avec les déphasages/vitesses individuels conservés. Les occurrences du même clip
  de l’autre tribune reçoivent aussi le remplacement.

Sources : builder Blender existant `04_rig_and_actions.py`, prefab régénéré par
`CaillouxMob.Build()`, `BattleBridge` et `ArenaLife`. Aucun changement de géométrie,
texture, rig, serveur ou chronologie de dégâts. Aucune génération payante.

## Vérification

`05_validate_motion.py` : huit clips, zéro erreur, boucles/retours sans rupture,
torse rigide et pieds fixes ; déplacement maximal d’une articulation par frame
0,0782 m à 30 fps, sous la limite existante de 0,08 m.

`CaillouxChecks.Playback()` : 50 états, sol entre −0,031 et +0,379 mm, mouvement
d’attente 37,6 mm, dérive des pieds pendant les quatre attaques 0,208 mm maximum.
Huit contacts contrôlés (quatre attaques de chaque côté) : distance poignet/surface
au plus 0,252 m pour le joueur et 0,264 m pour Cailloux ; le volume du poing prolonge
le poignet. KO au sol, impacts sur les sockets et finale vérifiés.

`LivingArenaChecks.Run()` : 18 supporters animés, continuité des mains, horloge figée,
retour arrière et réduction des animations passent. Capture Unity à 2622 × 1206 inspectée :
œil cyan et sourire visibles, poing côté caméra sous le visage.

Typecheck, lint, 637 tests et 37 previews passent. Export Unity Device et compilation
du framework iPhone réussis (UUID `7A0CA2A6-D8A2-39C4-8468-4C1B284F57FB`).
Le development build Debug compile avec zéro erreur et est installé sur Dyoxel via
`devicectl` (`app.grrind.dev`, installation `F4ABB270-9F95-41B3-9192-F1E826AA35F8`).
Le framework embarqué a le même UUID et ses 16 fichiers Data sont identiques à
l’export Device. Metro 8081 est conservé. Expo a refusé le lancement automatique
pendant le verrouillage du téléphone ; l’installation directe a ensuite réussi.
Validation artistique à faire par l’auteur dans un combat
contre Cailloux, en observant la garde, l’armé/impact/retour et les deux supporters signalés.
