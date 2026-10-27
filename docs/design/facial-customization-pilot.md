# Visages, nez et coiffures facettés par corps — #253, #304

Le pilote de #253 (visage carré, nez large, homme seul) est remplacé par #304 : chaque corps a
ses visages, ses nez et ses coiffures, tous facettés comme le reste du personnage (#299).
Le visage carré, jugé raté par l’auteur, est retiré ; les variantes partent du visage fin.

| | Homme | Femme |
| --- | --- | --- |
| Visages | fin, anguleux, ovale | fin, en cœur, rond |
| Nez | original, large, aquilin, épaté | original, retroussé, droit |
| Coiffures | coiffés, courts, crête, afro | chignons, longs, courts, queue de cheval, carré |

Le serveur décide de la compatibilité (`compatibleBodies`, grrind-back#323) ; un choix
incompatible revient au défaut du champ, sinon à la première option du corps.

## Sources et reconstruction

- `spikes/art-source/facial-pilot/ref/*.png` : planches Meshy nano-banana-2 (4 × 6 crédits),
  faites depuis des rendus des têtes facettées actuelles. Formes de référence, pas des mesures.
- `build/shapes.py` : visages et nez en shape keys (`Face<Style>`, `Nose<Style>`) sur la peau sport
  de chaque corps, écrits dans un repère relatif à la tête (0 au menton, 1 aux yeux). Le crâne,
  la nuque, les oreilles et le cou ne bougent pas (assertion). Sortie `FacialPilot/<Corps>SportFace.fbx`,
  puis `faceted-garments/facet_skin.py … Sport_Skin .25 all` donne `<Corps>SportFace_Faceted.fbx`.
- `build/hair.py` : crête et afro (homme), queue de cheval et carré (femme), en low poly direct
  autour du crâne de chaque corps, liés à l’os `Head`. Sortie `FacetedHair/Hair_<Style>.fbx`.

Dans Unity, `QuaterniusPoc.Build()` prend la peau sport du FBX de visage pour les deux corps ;
`QuaterniusAppearance.SelectFace` règle les blend shapes, `SelectHair` la coiffure du corps.
`QuaterniusPoc.Validate()` contrôle chaque coiffure, chaque forme (changement visible, arrière
de la tête intact, conservation avec les gants, retour exact au visage fin). `FacialPilot` et ses
copies de mains masquées n’existent plus : les gants recoupent la peau comme pour la femme.

Le bandeau n’est ajusté qu’aux coupes coiffés, courts et chignons ; il reste masqué sur les autres.
Les vignettes équipées montrent toujours l’homme par défaut.
