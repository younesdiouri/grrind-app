@AGENTS.md

# GRRIND — Client

Client **React Native (Expo)** de GRRIND, l'app qui transforme le sport en RPG. Ce dépôt ne
contient **que le client**. L'API vit dans [`younesdiouri/grrind-back`](https://github.com/younesdiouri/grrind-back)
(Symfony 8 / PostgreSQL), et le contrat entre les deux est `openapi.yaml`, rien d'autre.

## Règle n°0 : le contrat ne s'écrit pas à la main

`api/openapi.yaml` est une **copie** du fichier généré par le back, pas une source. On ne l'édite
jamais ici : on le tire, on régénère les types, et la CI échoue si le résultat dérive.

```bash
npm run api:pull       # récupère openapi.yaml depuis grrind-back (branche main)
npm run api:generate   # openapi-typescript → src/api/schema.d.ts
```

Aucun DTO écrit à la main, aucun enum recopié. `Discipline`, `SessionStatus`, `XpBreakdownSource`,
`ProgressUnit` et les 17 `type` d'erreur RFC 9457 sortent tous du schéma. Si un type manque au
client, il manque au contrat : ça se corrige côté back, pas ici.

## Règle n°1 : Expo a changé, on lit les docs versionnées

Voir `AGENTS.md`. Les docs de mémoire sont fausses d'une majeure à l'autre — SDK 57, Reanimated 4
et `react-native-worklets` ont chacun bougé récemment.

## Les trois invariants du client

Ce sont les trois endroits où une erreur ne se voit pas en développement et casse en production.

### 1. Le refresh est sérialisé, sous peine de déconnexion

Le refresh token est **à usage unique, rotatif et groupé par famille** (une famille = un appareil).
Le back révoque **toute la famille** quand un jeton déjà consommé est rejoué — il ne peut pas
distinguer le voleur du vrai client, donc il coupe.

Conséquence directe : deux requêtes qui expirent en même temps et déclenchent chacune un refresh
**déconnectent l'appareil**. Le middleware d'auth garde donc une promesse de refresh unique et
partagée ; les appels concurrents attendent la même, puis rejouent avec la paire neuve. Ce n'est
pas une optimisation, c'est la condition pour que la session survive.

### 2. `Idempotency-Key` est générée une fois, pas par tentative

Obligatoire sur `POST /api/workouts/import`. La clé est créée **à la constitution du lot**,
persistée avec lui, et renvoyée **à l'identique** sur chaque retry — réseau coupé, app tuée,
retour de veille. Une clé neuve par tentative annule tout le mécanisme.

Elle ne fait pas doublon avec l'unicité `(source, externalId)` côté serveur : celle-ci empêche le
**double crédit**, celle-là rend la **réponse d'origine**. Sans clé, un client qui rejoue reçoit
une synchronisation vide au lieu de sa mise en scène — l'XP serait juste, l'animation perdue.

### 3. Le JWT vit en mémoire, le refresh token dans le Keychain

L'access token dure 15 minutes et ne se révoque pas : le persister n'apporte rien et l'expose.
Le refresh token va dans `expo-secure-store`, jamais dans `AsyncStorage`.

## `SyncSummary` : l'ordre des clés est l'ordre de l'animation

C'est *l'*écran du produit. Le payload d'import se joue **de haut en bas**, sans jamais être trié
ni réordonné, et à deux niveaux : d'abord entre les workouts — `imported` est chronologique,
celui du crédit — puis à l'intérieur de chacun.

```
imported[i] → session → xp.breakdown (ligne à ligne) → level.reached → titlesUnlocked → loot → streak → unlockableNodes
```

`loot`, `streak` et `unlockableNodes` sont **présents et vides** jusqu'aux lots correspondants côté
back. Le client les saute tant qu'ils le sont ; il ne les rend pas optionnels.

**La continuité entre workouts est offerte, pas calculée.** Chaque `RewardSummary` porte son
palier de départ (`xpIntoLevelBefore` / `xpToNextLevelBefore`), et celui du workout *i+1* est
exactement l'arrivée du workout *i*. La barre s'enchaîne sans un seul recalcul ici.

**Le serveur envoie tout, le client décide de ce qu'il joue.** Rien ne se tronque côté serveur :
au-delà de `DETAILED_WORKOUTS`, le client condense le reste en une montée continue. C'est une
décision de mise en scène, elle vit dans `timeline.ts`, et elle ne change pas les totaux — ils
viennent de `totals`, qui existe pour ça et pour le saut.

`totals` vaut **`null`** quand rien n'a été crédité. Il n'y a pas d'état d'arrivée quand rien
n'est arrivé, et le client n'invente pas un zéro.

Le séquenceur vit dans `src/features/reward/`. `buildTimeline` est **pure** — pas de React, pas de
Reanimated, pas d'horloge — et porte toute la mise en scène, rampes d'interpolation comprises :
elle se prouve sur les fixtures capturées sans monter le moindre composant. Le composant ne fait
qu'interpoler. Les valeurs animées sont des `useSharedValue`, il n'y a **qu'une seule horloge**, et
**rien ne passe par `setState` dans une boucle** : les compteurs numériques s'animent sur le thread
UI. Le retour vers JS est réservé à l'haptique.

## Le serveur n'a plus l'horloge, il l'arbitre

**Il n'y a plus de chronomètre.** Un workout est un fait déjà passé quand l'app en entend parler :
il naît terminé, il n'a pas d'état, et rien ne s'ouvre ni ne se ferme. Les bornes viennent du
fournisseur santé, et le client les transmet **telles qu'il les a lues**.

Ce que le client n'envoie toujours pas, c'est une **durée** : elle se dérive de `startedAt` et
`endedAt`, côté serveur. L'accepter en entrée donnerait au client une prise sur ce qu'il gagne. Et
`durationSeconds` rendu dans un `Workout` est la durée *réellement mesurée* : au-delà du plafond,
l'XP est calculée sur une durée écrêtée, mais l'historique dit ce qui s'est passé.

Le client ne traduit rien non plus : il envoie l'`activityType` **brut du fournisseur**
(`HKWorkoutActivityType` côté Apple), jamais une `discipline`. La table de correspondance est
serveur, ce qui permet d'ouvrir un sport sans publier sur l'App Store. Un type inconnu n'est pas
une erreur — la séance est écartée et **nommée** dans la réponse. Le client ne filtre donc
**jamais** sur ce champ.

## Conventions

- TypeScript `strict`. Un `switch` sur un type d'erreur est **exhaustif** : le compilateur doit
  casser quand le back en ajoute un.
- Composants en `src/components/`, écrans en `src/app/` (expo-router, routes typées).
- Styles : tokens typés dans `src/design/tokens.ts` + `StyleSheet.create`. Pas de valeur en dur
  dans un composant.
- Le design system a **un seul sens** : les composants RN sont la source de vérité, les previews
  HTML en sont dérivées via `react-native-web` (`npm run previews`, vérifié en CI). Jamais
  l'inverse. Les durées et les courbes d'animation sont des tokens comme les couleurs — elles
  sortent du spike, et `timeline.ts` compose avec elles au lieu d'en inventer.
- Erreurs : `application/problem+json`, les `type` sont des URIs `https://grrind.app/problems/…`.
  C'est dessus que les messages se branchent, pas sur le code HTTP.

## Suivi du travail

Même tableau que le back : https://github.com/users/younesdiouri/projects/1 — un projet utilisateur
commun aux deux dépôts, avec une colonne « Repository » et un champ « Lot » qui traverse. Les
**jalons et labels, eux, sont par dépôt**.

**Aucun commit sans numéro de ticket.** `Refs #N` sur un commit intermédiaire, `Closes #N` sur le
dernier d'une feature. Une feature = un ticket = une branche = une PR. Référencer un ticket de
l'autre dépôt s'écrit en toutes lettres : `Closes younesdiouri/grrind-back#42`.

Format conventionnel, corps en français, à l'impératif, qui explique le *pourquoi* :
`feat(reward):`, `fix(auth):`, `refactor:`, `chore:`, `docs:`, `test:`.

## Ce qui n'est pas ici

- **Pas de Docker.** Contrairement au back, la chaîne Node/Expo tourne en local. C'est le seul
  point où les deux dépôts divergent sur la méthode, et c'est assumé : Expo pilote Xcode et un
  appareil physique, qu'un conteneur ne peut pas atteindre.
- **Pas de secret versionné.** `EXPO_PUBLIC_API_URL` vit dans `.env.local`.
- **Pas de logique de jeu.** Aucun calcul d'XP, aucun tirage de loot, aucune règle de streak. Le
  client affiche ce que le serveur a décidé. Si une valeur manque pour animer, elle s'ajoute au
  `RewardSummary` côté back — elle ne se recalcule pas ici.
