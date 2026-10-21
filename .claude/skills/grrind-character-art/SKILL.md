---
name: grrind-character-art
description: Produit ou modifie un personnage, un équipement, un mob ou une posture 3D du combat GRRIND dans Unity (Synty Sidekick, Meshy, Blender). À lire avant toute génération d'image de référence, de mesh, de rig, d'animation ou d'objet porté, et avant d'intégrer un avatar Unity dans l'app.
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
- **Un seul personnage d'abord** : deux coiffures et un item interchangeable, dans un atelier
  isolé fonctionnel sur Simulator. L'auteur valide personnellement les premières captures
  avant toute extension de l'itemisation. Une preuve technique ne vaut pas verdict artistique.
- **IA pour ce qu'elle fait bien** : objets de loot, mobs uniques, animations, variantes.
- **Animations : celles du pack Quaternius d'abord**, Mixamo si nécessaire. Meshy seulement
  pour un besoin réel d'objet ou de mob ; aucun appel payant pour ce POC.
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
**0,5 est le contact**, que l'horloge serveur place ; `MuscuPose.contacts` porte le contact
mesuré de chaque clip. Un geste qui ne se lit pas en silhouette se régénère, il ne se compense
pas par du code.

## Barrières, dans l'ordre

Chaque barrière bloque la suivante ; un échec renvoie à l'étape qui l'a produit.

1. **G0 — Premier pilote.** Captures du vrai personnage Unity, puis atelier isolé sur Simulator
   (demande du 21 octobre). Pas de production en série avant le verdict personnel de l'auteur.
2. **G1 — Entrée.** Un seul sujet par vue, fond uni, membres entiers, proportions mesurées.
3. **G2 — Mesh brut.** Les cinq contrôles GameFactory (bon objet, dos, complet, pas de sol,
   budget), échelle documentée (dimensions natives conservées pour Quaternius), proportions
   re-mesurées sur une capture orthographique.
4. **G3 — Rig et postures.** Les sept gestes au contact, de face et de trois quarts, avec et
   sans chaque objet : aucune interpénétration, pieds au sol, prise propre.
5. **G4 — Validation de l'auteur.** Planche côte à côte : référence approuvée, rendu Unity au
   cadrage et à l'éclairage du combat, à la résolution de l'iPhone. Réponse de l'auteur
   consignée mot pour mot. L'atelier POC isolé est autorisé avant ce verdict ; l'itemisation
   complète et le remplacement du personnage du combat attendent celui-ci.
6. **G5 — App.** Flow `.maestro/avatar-3d.yaml` via Metro, captures inspectées, selon
   `docs/ai/mobile-qa.md`. Rebuild natif seulement si le framework Unity a changé.
