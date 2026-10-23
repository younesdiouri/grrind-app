---
name: grrind-character-art
description: Produit ou modifie un personnage Quaternius, un équipement, un mob ou une posture 3D du combat GRRIND dans Unity, Meshy et Blender. À lire avant toute génération d'image de référence, de mesh, de rig, d'animation ou d'objet porté, et avant d'intégrer un avatar Unity dans l'app.
---

# Personnages 3D GRRIND

Un personnage est fini quand son rendu **dans Unity, au cadrage du combat, à la taille de
l'iPhone** tient la DA et que l'auteur l'a dit. Ni un fichier valide, ni une jolie
illustration ne le prouvent : #214 et #219 ont échoué exactement là.

## Décisions de l'auteur

- Tout le combat, PvE et PvP, se joue dans **Unity** ; React Native garde l'app et le HUD fixe.
  Le serveur reste l'arbitre : Unity joue la chronologie, il ne calcule rien.
- **Direction du 21 octobre 2026 : Sport Fantasy Cartoon**, base Quaternius pré-riggée,
  équipements sportifs ludiques et accents néon GRRIND. Le POC joint par l'auteur remplace
  les anciennes pistes Synty/sci-fi et les corps Meshy générés.
- **V1 validée personnellement le 21 octobre 2026** : « je suis convaincu je pense que c'est
  déjà pas mal pour une v1 ». Masculin, deux coiffures, bottes et duel PvP sur Simulator.
  Quaternius est la seule base retenue ; ne pas ressusciter Muscu ou les corps Meshy.
- **Suite autorisée au backlog** : féminin de la même banque Quaternius, équipements créés
  avec Meshy puis ajustés dans Blender, animations de combat Mixamo (#231). Avatar personnel,
  choix de coiffures/coiffes et persistance : `younesdiouri/grrind-back#308`.
- **IA pour ce qu'elle fait bien** : objets de loot, mobs uniques, animations, variantes.
- **Animations** : UAL2 pour la V1, Mixamo pour améliorer les combats. Meshy sert aux items
  et mobs ; annoncer les coûts avant génération. Ne pas générer de nouveaux corps humains.
- **Outils livrés avant code maison** : pas de client API, de builder ou de capture écrits à la
  main quand un plugin, un MCP ou un skill officiel le fait.

## Outils

| Besoin | Outil |
|---|---|
| Piloter l'éditeur Unity (scènes, prefabs, captures, Play, console) | MCP `unity` (`unity mcp`) et les skills du plugin `unity@claude-plugins-official` |
| Post-process néon (bloom), URP | skill `unity:urp-postprocessing` |
| Optimiser meshes et textures | skill `unity:asset-transformer-toolkit` |
| Générer objets, mobs, animations, UV | MCP `meshy` (coûts annoncés avant chaque appel payant) |
| Asset depuis références, mesuré contre elles | skill `blender-image-to-3d` |
| Règles de QA génériques | GameFactory-3A `agent_skills/asset_qa/*`, révision `db8a6f7` (lecture seule) |

Chaque tâche Meshy payante : id, paramètres et crédits notés dans le `tasks.json` de l'asset ;
chaque asset garde un `PROVENANCE.json` (outil, licence, modifications).

## Leçons mesurées (#219)

- Un générateur reproduit le **style de son entrée** : il faut lui donner une image déjà dans
  la DA cible, aucun prompt de texture ni shader ne rattrape un mauvais style d'entrée.
- **Mesurer les proportions**, pas les juger à l'œil : `spikes/art-source/heads_tall.py` sur
  l'image d'entrée et sur une capture orthographique du mesh. Une dérive de 3,3 à 4 têtes est
  passée inaperçue à l'œil.
- **Multi-vues** (`meshy_multi_image_to_3d`, face, profil, dos) : sinon le dos et les côtés
  sont inventés et les projections bavent.
- Meshy : `meshy-7.1`, `geometry_resolution: 2k`, budget fixé à la génération (jamais de
  lissage ni de décimation d'un mesh texturé après coup) ; `image_enhancement: false` et pas de
  `pose_mode` forcé si l'entrée est déjà posée (sinon visage redessiné et poings rouverts).
- Le rig Meshy n'a **pas d'os de doigt** : poings modélisés fermés, objet tenu attaché à la main.
- Un clip fait pour un squelette s'importe en **Generic** sur ce squelette : rien à recibler,
  pas de problème d'échelle. Hanches en nœud de mouvement pour garder les gestes sur place.
- Un prompt d'édition qui décrit une « prise » ou un « creux » fait apparaître l'objet suggéré.
- Un liseré coloré ou une teinte d'ombre teintée écrase les détails ; le neutre d'abord.

## Postures

Sept gestes, indexés par `UNITY_POSES` dans `src/features/combat/unityFrame.ts` : garde 0,
attaque 1, coup reçu 2, critique 3, esquive 4, combo 5, relance 6. La phase va de 0 à 1 et
**0,5 est le contact**, que l'horloge serveur place ; `FighterPose.contacts` porte le contact
mesuré de chaque clip. Un geste qui ne se lit pas en silhouette se régénère, il ne se compense
pas par du code.

## Barrières, dans l'ordre

Chaque barrière bloque la suivante ; un échec renvoie à l'étape qui l'a produit.

1. **G0 — Premier pilote.** La V1 masculine est validée sur Simulator. Pour tout nouveau corps,
   item ou lot de mouvements : une première preuve et verdict personnel avant production en série.
2. **G1 — Entrée.** Un seul sujet par vue, fond uni, membres entiers, proportions mesurées.
3. **G2 — Mesh brut.** Les cinq contrôles GameFactory (bon objet, dos, complet, pas de sol,
   budget), échelle documentée (dimensions natives conservées pour Quaternius), proportions
   re-mesurées sur une capture orthographique.
4. **G3 — Rig et postures.** Les sept gestes au contact, de face et de trois quarts, avec et
   sans chaque objet : aucune interpénétration, pieds au sol, prise propre. Pour un vêtement,
   appliquer aussi le [contrôle de raccord au corps](references/garment-fit.md) : un cou
   artificiellement long, un col flottant ou une rupture de silhouette bloque cette barrière
   et impose une correction de l'asset puis de nouvelles captures.
5. **G4 — Validation de l'auteur.** Planche côte à côte : référence approuvée, rendu Unity au
   cadrage et à l'éclairage du combat, à la résolution de l'iPhone. Réponse de l'auteur
   consignée mot pour mot. Le verdict V1 autorise sa conservation et la suppression des
   anciennes pistes ; il ne valide pas d'avance les nouveaux items ou le féminin.
6. **G5 — App.** Flow `.maestro/avatar-3d.yaml` via Metro, captures inspectées, selon
   `docs/ai/mobile-qa.md`. Rebuild natif seulement si le framework Unity a changé.
