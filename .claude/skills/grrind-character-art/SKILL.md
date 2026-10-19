---
name: grrind-character-art
description: Produit ou modifie un personnage, un équipement ou une posture 3D du combat GRRIND (Unity, Blender, Meshy, Tripo, GameFactory-3A). À lire avant toute génération d'image de référence, de mesh, de rig, d'animation ou d'objet porté, et avant d'intégrer un avatar Unity dans l'app.
---

# Personnages 3D GRRIND

Un personnage n'est pas fini parce que ses fichiers existent, que son avatar Humanoid est
valide ou que ses raccords sont propres. Il est fini quand son rendu **dans le moteur, au
cadrage du combat** ressemble au concept approuvé et que l'auteur l'a dit. La PR #214 a
passé 84 captures de raccords sans jamais poser cette question : c'est la raison d'être
de ce skill (#215).

## Où vit le combat

Décision du 19 octobre 2026 : tout le combat, PvE comme PvP, se joue dans **Unity**
(personnages, mobs, équipements, effets, caméra). React Native garde l'app, les menus et
la navigation. Les sprites 2D superposés et les essais hors Unity sont abandonnés : ils ne
tenaient pas avec plusieurs avatars et plusieurs objets. Le serveur reste l'arbitre : Unity
joue la chronologie qu'il a décidée, il ne calcule rien du jeu.

## Sources de vérité

- Concept approuvé : `docs/design/references/chunky-3d/concept.png` (à produire, voir la bible).
- Projet Unity : `spikes/Unity3D` ; scripts Blender : `spikes/art-source` (voir son README).
- Intégration et contrat d'horloge : `src/features/combat/unityFrame.ts`.
- Règles génériques : [GameFactory-3A](https://github.com/OpenDCAI/GameFactory-3A), révision
  `db8a6f757c28447285e86f749b54ee98bd512478`. On suit ses **skills**, on n'installe pas son
  pipeline (CUDA ou backends payants). Cloner hors du dépôt pour le lire :
  `git clone https://github.com/OpenDCAI/GameFactory-3A ~/Desktop/GameFactory-3A && git -C ~/Desktop/GameFactory-3A checkout db8a6f7`.

| Étape | Skill GameFactory à lire |
|---|---|
| Image de référence / T-pose | `agent_skills/asset_qa/image/SKILL.md` |
| Route, budget, cinq contrôles | `agent_skills/asset_qa/3d_object/SKILL.md`, puis `orientation_review.md` |
| Rig, retarget, animation cloud | `agent_skills/asset_qa/motion/SKILL.md` (sections *Cloud fallback (Tripo)* et *Retargeting*) |
| Dépense sur un backend payant | `agent_skills/asset_qa/README.md`, *Paid cloud backend* |
| Caméra, impact, lisibilité | `agent_skills/game-feel/SKILL.md` |
| API Unity | `agent_skills/engine_context/unity3d_api.md` |

## Bible DA verrouillée

Direction choisie le 19 octobre 2026 : **3D trapue de jeu mobile récent**, dans l'esprit de
Brawl Stars. Elle remplace le MMO peint de `concept-v2.png`, abandonné. Le nouveau concept
s'écrit dans `docs/design/references/chunky-3d/concept.png` une fois approuvé ; tant qu'il
n'existe pas, G1 et G4 ne peuvent pas passer et aucune génération payante ne part.

- Proportions trapues : 3 à 4 têtes, tête et mains grosses, jambes courtes, épaules larges.
  Silhouette lisible à la taille du combat sur un téléphone, avant tout détail.
- Formes simples et arrondies, gros volumes, peu de plis. Matières lisses et saturées,
  rugosité uniforme : pas de texture peinte de lumière, pas de microdétail, pas de
  photoréalisme, pas de pixel.
- L'objet est **surdimensionné** et porte l'identité du loot : les lunettes Course-poursuite
  ont leurs ailes dorées et leurs verres ambre, Haltère ego ses têtes octogonales marine et sa
  poignée laiton, Sprint-semelle son volume de basket marine/crème/or. Un objet qui a perdu
  ses traits est faux, même bien ajusté.
- Corps et objets ont le **même traitement** : même shader, même saturation, même contour.
- Rendu cible en moteur : URP Lit satiné (lissé .38, sans métal ni reflets d'environnement),
  ciel ambiant à trois tons, lumière clé et contre-jour cyan pour le liseré, ombre de contact,
  caméra perspective de trois quarts (`BuildChunky`, `BuildArena`). Le shader toon de #217
  ne sert plus qu'à l'ancien avatar MMO.

## Rôles et budgets

Le budget se fixe **à la génération** (paramètre de polycount du backend). On ne décime ni ne
lisse un mesh texturé après coup : ça détruit le sculpt et les UV (#214 : lissage du corps
entier et décimation de 88 k à 32 k triangles).

| Rôle | Triangles | Texture |
|---|---|---|
| Corps d'avatar | 30 000 | 2048 |
| Objet porté (chaussures, tenue) | 4 000 | 1024 |
| Objet tenu (arme, haltère) | 3 000 | 512 |
| Accessoire de tête | 2 000 | 512 |

## Choisir la route

| Sujet | Route | Pourquoi |
|---|---|---|
| Corps entier | **Générer d'un bloc** (Meshy en gamme payante ou Tripo, image vers 3D, auto-rig humanoïde) | Un personnage composé de pièces coûte plus de tours pour un pire résultat |
| Objet rigide tenu ou posé sur la tête | **Spec** Blender par script, puis texture peinte dans la palette du corps | Dimensions, axe et point d'attache sont exacts |
| Objet porté qui épouse le corps | **Générer**, puis caler sur le corps et transférer ses poids | C'est une couche sur un hôte : l'hôte doit exister et être mesuré d'abord |

Interdits, tous observés dans #214 :

- Greffer une partie d'un autre personnage (mains, rig) sur un corps généré. Préférer
  l'auto-rig du backend ou régénérer avec des doigts séparés dans l'image de référence.
- Déplacer un objet pose par pose pour masquer une mauvaise prise.
- Compter sur le prompt pour retirer ce que le modèle a toujours vu (« sans chaussures ») :
  demander la pièce, pas le tout amputé.
- Écrire du C# ou du Python compacté sur une ligne. Ces scripts se relisent en revue.

## Rendu peint main (cible depuis le 19 octobre 2026, référence de style : Waven)

Le générateur reproduit le **style de l'image d'entrée** : un rendu 3D satiné en entrée donne
un personnage satiné, aucun prompt de texture ni réglage de shader ne le rattrape (#219,
mesuré). La recette qui a fonctionné :

1. Entrée **déjà peinte main** : planche de style puis vues face, dos et profil
   (`docs/design/references/chunky-3d/brief.md`), proportions mesurées en G1.
2. Mesh multi-vues (`multi-image-to-3d` du MCP Meshy), `smart-topology` / `meshy-t2.5`,
   environ 15 000 triangles : topologie propre, côtés et dos tirés de vraies vues.
3. `meshy_retexture` avec la vue de face en image de style, `meshy-6`,
   `remove_lighting: false` (garder la lumière peinte), `enable_original_uv: true` ;
   `meshy_uv_unwrap` si les UV doivent être retouchées.
4. Rig Meshy, `normalize_meshy_rig.py`, `BuildChunky.Create("PaintedAthlete", true)` :
   `GRRIND/Painted Toon` quasi unlit (rampe faible, rim .12, contour brun).

Limite connue : une seule image de face se projette mal sur les côtés (traînées sur les
tibias, bandes du short doublées). Prochaine étape : `multiview_image_urls` (meshy-7) avec
face, dos et profils peints. `bake_painted.py` (occlusion et lumière cuites) reste un
appoint : seul, il donne des dégradés doux, pas des ombres peintes.

## Meshy : ce qui a été mesuré (#219)

Tout passe par le **MCP Meshy** (`@meshy-ai/meshy-mcp-server`, enregistré en local par
`claude mcp add-json meshy …`) : génération, édition d'image, multi-vues, retexture, UV,
rig, animations et `text-to-motion`. Aucun client maison. La clé vit dans la config locale de
Claude, jamais dans le dépôt. Après chaque tâche payante, ajouter son id, ses paramètres et
ses crédits au `tasks.json` du personnage (l'historique de #219 y est). Réglages retenus :

- Satiné (abandonné) : `meshy-7.1`, `geometry_resolution: 2k`, remesh à 30 000 triangles,
  texture 4K avec cartes PBR. Peint main : voir la recette ci-dessus.
- `pose_mode` vide et `image_enhancement: false` : une T-pose forcée rouvre les poings, et
  l'amélioration redessine le visage.
- L'auto-rig Meshy n'a **aucun os de doigt** : les poings sont sculptés fermés dans l'image
  d'entrée, les objets tenus s'attachent à l'os de la main.
- Le FBX riggé est en centimètres sous une armature à 0,01 : le réexporter avec
  `normalize_meshy_rig.py` (Blender) avant Unity, sinon le Humanoid s'anime cent fois trop
  grand. Supprimer l'ancien `.meta` du FBX à chaque nouveau rig.
- Un prompt d'édition ne doit pas décrire de « creux » ou de « prise » : le modèle ajoute
  l'objet suggéré. Demander des poings vides.

## Postures

Sept gestes, indexés par `UNITY_POSES` dans `unityFrame.ts` : `idle` (garde) 0, `attack` 1,
`hit` 2, `critical` 3, `dodge` 4, `combo` 5, `replay` 6. La phase va de 0 à 1 et **0,5 est le
contact**, que l'horloge serveur place. Une posture ne change jamais un timing : elle remplit
celui que le combat impose.

Chaque geste se lit en silhouette à la taille du combat : anticipation, contact, retour. Un
clip générique de pack qui ne se lit pas ainsi est retravaillé ou remplacé (Tripo, retarget,
ou keys Unity), il n'est pas « adapté à la présentation ».

## Barrières, dans l'ordre

Chaque barrière bloque la suivante. Un échec renvoie à l'étape qui l'a produit : une image
fausse se régénère en image, pas en mesh.

1. **G1 — Image.** Un seul sujet en T-pose, fond uni, membres entiers, pas de planche
   multi-vues. Dériver l'image **du concept lui-même** (pas d'une image intermédiaire) et
   **mesurer** les proportions : `python3 -I spikes/art-source/heads_tall.py <image>` doit
   donner celles du concept (≈ 3,3–3,5 têtes). Une T-pose à 4 têtes a déjà perdu la DA
   (#219) ; l'œil ne l'a pas vu, la mesure si.
2. **G2 — Mesh brut.** Les cinq contrôles GameFactory (bon objet, dos, complet et debout,
   pas de sol, budget), plus l'échelle à 1,70 m. Les miniatures Meshy sont en perspective :
   mesurer les proportions sur `BuildChunky.Silhouette` (bind pose orthographique) avec le
   même `heads_tall.py` qu'en G1. Rejet : changer prompt, seed ou budget et
   noter lequel, puis régénérer.
3. **G3 — Rig et postures.** Planche des sept gestes au contact, de face et de trois quarts,
   avec et sans chaque objet : aucune interpénétration, poignets, chevilles et prise propres.
   `AgentScripts/BuildMMO.cs`, entrée `Review`, produit la base de cette planche.
4. **G4 — DA, validée par l'auteur.** Image côte à côte : le concept approuvé à gauche, rendu
   Unity de `Arena.unity` au cadrage et à l'éclairage du combat à droite, base et équipé.
   `BuildMMO.CaptureCombat` et `BuildMMO.Board` (via `unity command run_script`) la produisent.
   La montrer à l'auteur et consigner sa réponse mot pour mot dans la doc du lot. Pas
   d'intégration dans l'app sans ce verdict.
5. **G5 — App.** Flow `.maestro/avatar-3d.yaml` via Metro, captures inspectées, selon
   `docs/ai/mobile-qa.md`. Le build natif n'est refait que si le framework Unity a changé.

## Dépense et provenance

Avant le premier appel payant : estimer le coût (retries compris), le dire, attendre l'accord
explicite. Chaque asset garde à côté de lui un `source.json` : outil et version, prompt ou
image d'entrée, seed, budget demandé, crédits dépensés, licence et crédit à afficher.
