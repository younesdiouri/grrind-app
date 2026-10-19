# Source du personnage MMO peint

La référence active est `docs/design/references/flyff-3d-proposal/concept-v2.png`,
approuvée le 19 octobre 2026. Un personnage pilote ; la seconde morphologie et les
variantes de peau ne sont pas livrées par ce travail. Aucun filtre pixelisé.

## Provenance

- Patron frontal A-pose : ImageGen, dérivé de la V2. Tenue neutre, pieds nus, sans loot.
- `mmo-athlete-v1/meshy-textured.glb` : reconstruction et texture Meshy 6 Lite depuis
  ce patron, 20 crédits gratuits alloués utilisés. PBR désactivé. Brut : 87 818 triangles.
- Meshy réserve l’auto-rig à un abonnement sur cette exécution. Aucun achat n’a été fait.
- Rig et mains articulées : adaptation du squelette et des mains **Quaternius Universal
  Base Characters**, CC0 ; provenance et licence dans `Unity3D/Assets/Characters/Quaternius`.
- Mouvements : Quaternius Universal Animation Library 2, CC0. Les sept gestes sont
  échantillonnés par l’horloge existante du combat, pas par une nouvelle simulation.
- Lunettes, haltère, chaussures : géométrie GRRIND produite dans Blender via MCP.
- Modèle Meshy sous CC BY 4.0 : créditer **Meshy**, avec lien vers https://www.meshy.ai
  et https://creativecommons.org/licenses/by/4.0/ ; modifications : mains remplacées,
  raccords, lissage, réduction de géométrie, rig, poids, équipements séparés.

## Outils réellement exécutés

Blender 4.5.14 LTS et `mcp-for-blender` 2.2.0, Unity 6000.3.26f1,
Unity CLI 1.0.0-beta.13 / Pipeline 0.8.0-exp.1. La génération Meshy est passée par
le site connecté. Aucun serveur MCP Meshy, Unity Assistant ou PixelLab n’a généré le résultat.

Les guides objet/mouvement/revue de [GameFactory-3A](https://github.com/OpenDCAI/GameFactory-3A)
ont servi à séparer génération organique, assemblage rigide, rig et revue réelle.
Révision étudiée : `db8a6f757c28447285e86f749b54ee98bd512478`.
Le pipeline complet GameFactory-3A, ses modèles CUDA et ses backends payants ne sont
pas installés/exécutés. Ne pas revendiquer leur exécution.

## Refaire les exports

Le MCP exécute ces scripts dans une scène Blender de travail dédiée. Ils effacent/remplacent
les objets de cette scène, pas les fichiers source. Sauvegarder une scène personnelle avant
usage. Pour fournir `__file__` au script depuis `execute_blender_code` :

```python
p = '/chemin/grrind-app/spikes/art-source/rig_mmo_athlete.py'
exec(compile(open(p).read(), p, 'exec'), {'__file__': p, '__name__': '__main__'})
```

Ordre :

1. `rig_mmo_athlete.py` importe le brut, normalise à 1,70 m, adapte le rig CC0 en A-pose,
   remplace les doigts soudés par les mains articulées et sauvegarde `fitted-rig.blend`.
2. `finish_mmo_rig.py` pose les poids, rigidifie visage/cheveux, raccorde les poignets,
   partage la texture aux mains et réduit la géométrie. Une vraie coupe à 14,5 cm sépare
   les pieds ; les poids mollet/pied de ce raccord correspondent à ceux de la chaussure.
   Export vers `Unity3D/Assets/Characters/MMOAthlete` : environ 32 200 triangles, quatre
   influences maximum et aucune vertex sans poids. Le rapport donne les valeurs exactes.
3. `make_mmo_boots.py` produit les deux chaussures, ajustées au contour réel des chevilles.
   La semelle suit le pied ; le col suit progressivement le mollet dans le builder Unity.
4. `make_mmo_equipment.py` produit l’haltère, joint par matériau. Pour les lunettes,
   charger ce module dans un namespace avec `__file__`, vider la scène de travail,
   puis appeler `export_and_render(goggles())`. Copier les FBX de `mmo-athlete-v1/gear/`
   vers le dossier `Gear` du modèle Unity.
5. Unity CLI : `AgentScripts/BuildMMO.cs`, entrée `BuildMMO.Create`, hors Play.
   L’import du corps est Humanoid, Bake Axis Conversion activé, normales recalculées.
   Le builder garde les pieds nus séparés pour pouvoir les masquer avec les chaussures.
6. Entrer en Play puis `BuildMMO.Review` : 84 captures réelles, sept gestes, deux sens,
   préparation/contact/retour, puis tête/prise/chaussures au contact. Les fichiers sont
   sous `artifacts/unity-spike/mmo-v1/review`. Examiner aussi la base sans objets.
7. Après revue, relier le prefab à `Arena.unity`, puis `scripts/unity-ios.sh` et les
   development builds GRRIND. Lire `docs/ai/mobile-qa.md` avant le flow mobile.

Une seule attache d’arme est utilisée pour tous les gestes. Son centre a été calibré
sur les arcs des quatre doigts fermés ; les valeurs de flexion sont propres à ce rig.
Ne pas déplacer l’arme par pose pour masquer une mauvaise prise.

Les `.blend` et exports de travail dupliqués restent locaux/ignorés. Le brut, les scripts,
les rapports, les références et les exports Unity sont versionnés.
