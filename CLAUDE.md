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

Obligatoire sur `POST /api/training/sessions/{id}/complete` et `.../abandon`. La clé est créée
**à l'ouverture de la séance**, persistée avec elle, et renvoyée **à l'identique** sur chaque
retry — réseau coupé, app tuée, retour de veille. Une clé neuve par tentative annule tout le
mécanisme et double l'XP. Un rejeu reconnu revient avec l'en-tête `Idempotent-Replay: true`.

### 3. Le JWT vit en mémoire, le refresh token dans le Keychain

L'access token dure 15 minutes et ne se révoque pas : le persister n'apporte rien et l'expose.
Le refresh token va dans `expo-secure-store`, jamais dans `AsyncStorage`.

## `RewardSummary` : l'ordre des clés est l'ordre de l'animation

C'est *l'*écran du produit. Le payload de complétion se joue **de haut en bas**, sans jamais être
trié ni réordonné :

```
session → xp.breakdown (ligne à ligne) → level.reached → titlesUnlocked → loot → streak → unlockableNodes
```

`loot`, `streak` et `unlockableNodes` sont **présents et vides** jusqu'aux lots correspondants côté
back. Le client les saute tant qu'ils le sont ; il ne les rend pas optionnels.

Le séquenceur vit dans `src/features/reward/`. Les valeurs animées sont des `useSharedValue`,
l'enchaînement des `withSequence`/`withTiming`, et **rien ne passe par `setState` dans une boucle** :
les compteurs numériques s'animent sur le thread UI. Le retour vers JS est réservé à l'haptique.

## Le serveur possède l'horloge

Le client n'envoie jamais de timestamp. Il ouvre une séance, il la ferme, et c'est le serveur qui
décide de la durée retenue (`durationSeconds` est déjà écrêté — ce n'est pas `endedAt - startedAt`).
Le chronomètre affiché est un affichage, pas une mesure.

## Conventions

- TypeScript `strict`. Un `switch` sur un type d'erreur est **exhaustif** : le compilateur doit
  casser quand le back en ajoute un.
- Composants en `src/components/`, écrans en `src/app/` (expo-router, routes typées).
- Styles : tokens typés dans `src/design/tokens.ts` + `StyleSheet.create`. Pas de valeur en dur
  dans un composant.
- Le design system a **un seul sens** : les composants RN sont la source de vérité, les previews
  HTML en sont dérivées via `react-native-web`. Jamais l'inverse.
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
