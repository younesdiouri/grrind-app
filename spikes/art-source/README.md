# Sources des personnages Quaternius

La base masculine et le duel ont été validés par l’auteur le 21 octobre 2026.
Les anciennes pistes de corps générés et leurs scripts ont été supprimés (#221).

- `prepare_quaternius_head.py` prépare dans Blender la tête et le raccord de cou du
  personnage Quaternius, depuis les packs Standard locaux CC0.
- `heads_tall.py` mesure les proportions d’une silhouette de référence.
- Assemblage et validation Unity : `Assets/Editor/QuaterniusPoc.cs`.
- Procédure, provenance et limites : `../../docs/design/quaternius-poc.md`.

Les exports de travail Blender restent locaux ; les meshes Unity utilisés, leurs licences
et leur provenance sont versionnés. L'itération #231 ajoute le féminin, cinq clips Mixamo
et un premier équipement Meshy → Blender dans `bandeau-eclair/` : source GLB, référence,
requête/coût, préparation reproductible, master Blender local, manifeste et contrôle de réimport.
