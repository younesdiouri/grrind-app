# PvE et ʿĀlam al-Nafs — Unity et nouveau bestiaire

Trois chantiers distincts :

- **Refonte métier d’Ālam — backend** : [grrind-back#317](https://github.com/younesdiouri/grrind-back/issues/317).
  Règles, déroulement, catalogue serveur, résultats, récompenses et contrat si nécessaire.
- **Création des nouveaux adversaires 3D — art** : [#251](https://github.com/younesdiouri/grrind-app/issues/251).
  Références, Meshy, préparation Blender, rigs/animations, prefabs et validation artistique.
- **Intégration Unity — app** : [#249](https://github.com/younesdiouri/grrind-app/issues/249).
  Scènes PvE/raid, consommation du contrat et retrait des anciens sprites.

Statut au 24 octobre 2026 : première tranche dans #267, décrite dans
[Al Kasal — raid Unity V1](al-kasal-unity.md). Le raid utilise maintenant une seule scène
Unity, un paresseux facetté Meshy et ses canapés, les participants Quaternius et l’arène
d’hiver. Le contrat existant suffit à cette présentation ; la refonte métier reste séparée.

## Décision de l’auteur

ʿĀlam al-Nafs passera dans Unity. Tous les sprites de combat seront remplacés et
l’ancien PvE sera retiré avec ses mobs, son rendu et les assets/outils devenus inutiles.
Le bestiaire sera recréé en 3D avec Meshy, puis préparé dans Blender pour Unity.
Les anciens designs d’Al-Kasal et de Cailloux ne sont pas des références à reproduire.
La liste, les noms et l’identité des nouveaux ennemis restent à définir avec l’auteur.

La cible couvre le PvE solo, les rencontres et boss d’Ālam, ainsi que les participants
du raid. La DA reste **Sport Fantasy Cartoon**, cohérente avec les sportifs Quaternius
et les équipements Unity. Les humains conservent cette base ; Meshy sert aux nouveaux
mobs et objets. Le volet bestiaire de #220 est repris par #251 ; l’équipement
de l’adversaire PvP reste dans #220.

## État actuel et retrait prévu

Le [1v1 utilise déjà Unity](../ai/unity-1v1.md) pour les humains, mais conserve les
illustrations de certains mobs. Le raid utilise `RaidScene` dans le même runtime Unity
que le duel, avec une liste de participants et un mode de scène explicite. Son HUD
et ses résultats restent dans React Native.

| Existant à remplacer ou auditer | Destination |
| --- | --- |
| `src/features/alam/RaidStage.tsx` | Remplacé dans #267 par une scène Unity avec participants, boss et petits mobs |
| `src/features/combat/FighterSprite.tsx` | Repli `DEFAULT_RAID_HERO` retiré dans #267 ; autres mobs solo à migrer |
| `bundledMobs.ts`, résolution d’images dans `enemyPresentation.ts` et branche sprites de `BattleView.tsx` | Résolution explicite des nouveaux mobs 3D |
| `appearances.ts`, `useAppearances.ts` | Retirés dans #267 avec le dernier consommateur du raid |
| `assets/images/heroes/retro-strength/` et décor 2D `assets/images/arenas/alam.png` | Retirés dans #267 ; les sprites des autres mobs solo restent à migrer |
| Ancien atelier 1v1 Al Kasal, sprites, flow et script de fabrication 2D | Retirés dans #269 ; les anciennes entrées ouvrent le raid Unity |
| Docs du prototype et du pipeline 2D, anciennes preuves Al Kasal | Retirées dans #269 ; documentation Unity conservée |

Les sons, VFX, HUD et fonctions de chronologie partagés sont audités selon leurs usages.
Tout élément propre à l’ancien PvE sans consommateur est supprimé. Les petites vignettes
déjà exportées de modèles Unity restent des aperçus du nouveau système.

## Nouveau pipeline artistique

Suivre le skill du dépôt `grrind-character-art` et, pour la fabrication depuis des
références, `blender-image-to-3d`. Utiliser les plugins/MCP Unity, Meshy et Blender
disponibles avant tout script spécifique.

1. Définir un premier mob avec l’auteur : rôle visuel, silhouette, dimensions,
   gestes et budget de triangles/textures. Valider ses références dans la DA cible.
2. Annoncer le coût avant chaque génération Meshy payante ; consigner identifiant,
   paramètres et crédits dans les sources de l’asset.
3. Contrôler le mesh, son dos, son échelle et ses proportions mesurées ; préparer
   matériaux, rig et animations dans Blender. Conserver sources et provenance/licence.
4. Vérifier les gestes utiles dans Unity : repos, attaque, coup reçu, critique,
   esquive, combo et relance. Caler les contacts sur la chronologie de présentation.
5. Faire valider le pilote par l’auteur sur une comparaison référence/rendu Unity
   au cadrage réel et à la taille iPhone, puis dans l’app, avant de décliner le bestiaire.

Les nouveaux assets et leurs sources suivent les dossiers existants
`spikes/art-source/`, `spikes/Unity3D/Assets/` et `references/`. Pas de nouvelle
génération de corps humains ni de production de nouveaux packs de sprites 2D.

## Répartition et invariants

React Native garde l’application et le HUD ; Unity présente la scène et les acteurs.
Le serveur décide des événements, résultats, gains et règles. Le rendu ne recalcule
ni dégâts, ni progression, ni récompenses. La refonte métier d’Ālam relève uniquement
de **grrind-back#317**, dont les nouvelles règles restent à cadrer avec l’auteur ;
ce document ne fixe aucun rééquilibrage. Le rendu Unity et la fabrication des modèles
restent les chantiers distincts #249 et #251 côté app.

Les changements de catalogue, les identifiants de nouveaux mobs, les données d’avatar
et le devenir des anciennes références se traitent avec **grrind-back**, propriétaire
de son code et de ses données. Le contrat officiel est généré côté back puis tiré ici ;
aucun DTO ni OpenAPI modifié à la main côté client. Les données d’avatar manquantes
ne sont pas inventées dans le client.

Les historiques restent lisibles sans conserver un moteur de sprites : définir une
correspondance explicite par identifiant/version vers le nouveau rendu, ou présenter
le résultat sans scène si aucune correspondance n’existe. Ne pas déduire le modèle
du nom traduit d’un ennemi. Lecture et replay restent sans attribution de gains.

## Ordre de réalisation et critères de fin

1. Cadrer le bestiaire, le pilote, les budgets artistiques et la correspondance serveur.
2. Livrer un pilote complet : un nouveau mob contre le héros dans le PvE Unity.
3. Livrer la scène Ālam avec boss et plusieurs participants ; vérifier reprise/replay.
4. Remplacer le reste du bestiaire et les derniers consommateurs de sprites.
5. Supprimer l’ancien PvE 2D, ses replis, ateliers, assets, branches, tests spécifiques,
   scripts, docs et preuves obsolètes. Contrôler les imports et ressources embarquées.

Le chantier est fini quand aucun personnage ou mob de combat n’utilise les anciens
sprites, que le nouveau bestiaire est validé dans l’app et que victoire/défaite,
Passer, reprise, replay et accès aux résultats restent fonctionnels. Une indisponibilité
de Unity ne bloque pas les résultats et ne recharge pas l’ancien moteur 2D.

## Vérification proportionnée

Pendant l’implémentation, garder les tests utiles sur le code réel : chronologie,
contacts, reprise/replay, lecture des valeurs serveur, idempotence et accessibilité.
Adapter les parcours existants aux nouveaux mobs, sans conserver d’assertions liées
aux anciens sprites. Sur le code final :

```sh
npm run typecheck
npm run lint
npm test
npm run previews:check  # si composants rendus, tokens ou previews changent
npm run api:check       # seulement si le contrat change
```

Pour une tranche cohérente, réutiliser `npm run e2e:ios:dev`, puis un flow pertinent :
`E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/alam-scene.yaml` pour le raid autonome,
ou le flow PvE/Ālam réel adapté pour une modification de parcours réseau.
Inspecter les captures à la taille iPhone et mesurer les proportions contre la référence.
Suivre [la procédure QA](../ai/mobile-qa.md), sans cumuler des parcours redondants.

Un nouvel export du framework Unity impose le rebuild de développement concerné ;
les changements JS suivants passent par Metro. Poids, mémoire et chauffe se mesurent
sur le candidat iPhone lors d’une livraison explicitement cadrée, en lien avec #218.

La livraison de ce document ne change aucun code ni asset actif. Elle ne lance ni
génération payante, ni build, ni opération backend. Le ticket de réalisation reste ouvert.
