# PvE et ʿĀlam al-Nafs — Unity et nouveau bestiaire

Ticket de réalisation : [#249](https://github.com/younesdiouri/grrind-app/issues/249).
Statut : chantier futur, cadrage du 23 octobre 2026 ; réalisation non démarrée.

## Décision de l’auteur

ʿĀlam al-Nafs passera dans Unity. Tous les sprites de combat seront remplacés et
l’ancien PvE sera retiré avec ses mobs, son rendu et les assets/outils devenus inutiles.
Le bestiaire sera recréé en 3D avec Meshy, puis préparé dans Blender pour Unity.
Les anciens designs d’Al-Kasal et de Cailloux ne sont pas des références à reproduire.
La liste, les noms et l’identité des nouveaux ennemis restent à définir avec l’auteur.

La cible couvre le PvE solo, les rencontres et boss d’Ālam, ainsi que les participants
du raid. La DA reste **Sport Fantasy Cartoon**, cohérente avec les sportifs Quaternius
et les équipements Unity. Les humains conservent cette base ; Meshy sert aux nouveaux
mobs et objets. Le volet bestiaire de #220 est élargi par ce chantier ; l’équipement
de l’adversaire PvP reste un sujet distinct.

## État actuel et retrait prévu

Le [1v1 utilise déjà Unity](../ai/unity-1v1.md) pour les humains, mais conserve les
illustrations des mobs. Le raid assemble encore des sprites dans React Native.
Le bridge de combat actuel présente deux acteurs : le raid à plusieurs participants
demande une scène adaptée, pas une instance Unity par personnage.

| Existant à remplacer ou auditer | Destination |
| --- | --- |
| `src/features/alam/RaidStage.tsx` et les apparences chargées par l’écran du raid | Scène Unity avec les participants et le boss |
| `src/features/combat/FighterSprite.tsx`, dont le repli `DEFAULT_RAID_HERO` | Retrait après remplacement de tous les appelants |
| `bundledMobs.ts`, résolution d’images dans `enemyPresentation.ts` et branche sprites de `BattleView.tsx` | Résolution explicite des nouveaux mobs 3D |
| `appearances.ts`, `useAppearances.ts` et leurs consommateurs de sprites historiques | Retrait du chargement des anciennes apparences 2D |
| `assets/images/heroes/retro-strength/`, `assets/images/enemies/` et décor 2D `assets/images/arenas/alam.png` | Nouveaux personnages et scène Unity ; suppression des anciens fichiers sans consommateur |
| Ateliers Al-Kasal, démonstrations, fixtures de présentation, flows et scripts de fabrication 2D | Adapter aux nouvelles scènes ou supprimer si devenus inutiles |
| Docs de l’ancien PvE, dont `al-kasal.md` et `combat-art-workflow.md`, et leurs preuves | Retirer ce qui est remplacé ; conserver la documentation du nouveau pipeline |

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
ni dégâts, ni progression, ni récompenses. Le cadrage des éventuelles nouvelles règles
PvE reste à faire ; ce document ne fixe aucun rééquilibrage.

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
