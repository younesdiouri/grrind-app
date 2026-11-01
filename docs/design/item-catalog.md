# Catalogue d’équipements et montée en volume

Décision #347 : conserver les responsabilités existantes.

| Responsable | Données et comportement |
| --- | --- |
| Serveur | Clé stable, nom traduit, slot, rareté, prix, bonus, loot ; possession, pièces, validations et calculs de combat. Catalogue publié et révision ; snapshots des combats. |
| App / Unity | Clé → modèle, matériaux/teintes, attaches, masquage, animation, rendu et repli pour une clé inconnue. Aucun prix ni bonus recopié en dur. |
| Stockage d’assets | Icônes HTTP existantes ; modèles actuellement embarqués. Des bundles versionnés/CDN pourront suivre le rythme des livraisons. |

Ajouter un équipement implique de publier sa définition serveur **et** de livrer son rendu.
Le modèle seul dans l’atelier n’est pas un objet possédé. Une clé inconnue doit rester lisible
dans l’inventaire sans fabriquer un autre objet Unity. Les replays utilisent leur référence
figée, jamais l’équipement actuel ; une future distribution distante devra conserver les
versions d’assets nécessaires à ces références.

## Limite actuelle constatée

`BattleBridge.Create` charge `QuaterniusShowcase`/`QuaterniusFemale` via `Resources.Load`.
Ces prefabs référencent les équipements et `QuaterniusAppearance` les active/masque.
Masquer un objet ne décharge pas les meshes et textures référencés. Ce pilote ne doit donc
pas être considéré comme une validation mémoire pour cent modèles différents.

Avant une production en volume, mesurer sur iPhone le démarrage Unity, le premier portrait,
un changement d’équipement et un duel à deux tenues : mémoire meshes/textures, pic de mémoire,
temps de chargement et temps par frame. Aucun benchmark iPhone à cent items n’a été réalisé.

Si ces mesures confirment le coût attendu des références, séparer les équipements des prefabs
de corps et charger uniquement les objets portés/essayés, avec libération de leurs références.
Les Addressables locaux sont une première option ; le CDN devient utile si l’on souhaite
livrer des modèles sans nouveau binaire. Prévoir cache, compatibilité et repli avant ce passage.
Réutiliser mesh et matériaux pour les variantes de couleur ; dimensionner les textures selon
leur taille réellement affichée. Une centaine de définitions JSON ne justifie pas à elle seule
un service supplémentaire ou cent requêtes de catalogue.

Sources officielles : [Resources et ses limites](https://docs.unity3d.com/6000.3/Documentation/Manual/LoadingResourcesatRuntime.html),
[Addressables : chargement local/distant et libération](https://docs.unity.com/en-us/engine/6000.3/manual/packages-list/packages-all/pack-safe/com-unity-addressables),
[Memory Profiler](https://docs.unity3d.com/6000.3/Documentation/Manual/ProfilerMemory.html).
