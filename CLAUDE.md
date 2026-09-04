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

### 3. Les deux jetons vont dans le Keychain, et un démarrage ne fait pas tourner le refresh

Le refresh token va dans `expo-secure-store`, jamais dans `AsyncStorage`. **Le jeton d'accès y
va aussi** depuis le #146, avec son instant d'expiration et le profil du dernier `adopt()` —
même magasin, même classe de protection : c'est un porteur de session, il ne va pas ailleurs.

Ce n'est pas de la commodité, c'est le correctif d'une déconnexion mesurée en production. Le
raisonnement d'avant — « quinze minutes, le persister n'apporte rien » — coûtait une **rotation
entière du refresh token à chaque naissance de process**, réveil en arrière-plan compris, et
chaque rotation traverse une fenêtre irréductible : entre le `COMMIT` du serveur et l'écriture
du trousseau, un process tué perd le successeur, et l'ouverture suivante présente un jeton
consommé — que le back lit comme un rejeu, et il révoque la famille. Le 2026-09-01, un réveil
qui n'avait rien à faire tourner a coûté la session cinquante minutes plus tard.

`restore()` reprend donc la session stockée **sans rien faire tourner** tant que le jeton
d'accès est valide, marge de 60 s comprise (`storedSession.ts`, pur et testé). Il ne rotate que
sur un jeton expiré, absent ou illisible — un trousseau muet retombe sur la rotation, jamais sur
une déconnexion (#142). Le chemin paresseux ne bouge pas : un 401 appelle toujours `refresh()`,
et c'est lui le filet.

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

## Qui écrit quoi : l'architecte et le développeur

Le travail se fait à deux, et la séparation n'est pas une répartition de charge — c'est **une
relecture par quelqu'un qui n'a pas écrit le code**.

```
        Architecte  ──────────────►  developer-sonnet  ──────────────►  PR  ──────────────►  Architecte
        (Opus)        délègue         (.claude/agents/)     ouvre                              revue finale
                                                                                               et fusion
   ticket rédigé,                 implémentation, tests,                              relit contre le ticket,
   périmètre tranché              lint, typecheck, commits                            fusionne ou renvoie
```

**L'architecte** rédige le ticket avant qu'une ligne soit écrite : le *pourquoi*, le périmètre en
cases à cocher, et surtout **ce qu'on ne fait pas**. Un ticket qui laisse le comment ouvert est
normal ; un ticket qui laisse le pourquoi ouvert ne part pas.

**`developer-sonnet`** implémente le ticket en entier et ouvre la PR. Il ne fusionne jamais, il
ne réduit jamais le périmètre de lui-même, et il **remonte au lieu de contourner** quand un
invariant du client lui barre la route. Sa fiche vit dans `.claude/agents/developer-sonnet.md`
et porte les six interdits sous une forme opérationnelle.

**La revue finale revient à l'architecte**, et elle se fait *contre le ticket* : ce qui est coché
l'est-il vraiment, ce qui ne l'est pas est-il expliqué, et la PR a-t-elle tranché quelque chose
qui aurait dû remonter. C'est là que les décisions de produit se tiennent — il n'y a nulle part
ailleurs où elles pourraient se tenir, voir la section suivante.

**Et l'architecte fusionne lui-même sur `main`**, dans la foulée de sa revue, sans demander la
permission de le faire. La revue *est* l'autorisation ; redemander après l'avoir donnée n'ajoute
aucune sécurité, ça ajoute un aller-retour. La seule chose qui reste à remonter avant de
fusionner est une PR qui a tranché quelque chose que le ticket ne tranchait pas.

## Il n'y a pas de CI, et les barrières tournent avant le push

Le workflow GitHub Actions a été supprimé (#85), comme celui du back avant lui
(`grrind-back#178`) : il rejouait, sur une machine reconstruite à chaque fois, exactement ce
qu'on lance déjà en local en quelques secondes. Le développeur passe les barrières **avant de
pousser**, et c'est cette exécution-là qui fait foi — pas une seconde, plus lente, qu'on ne
regarde qu'après coup.

```bash
npm run typecheck       # TypeScript strict
npm run lint
npm test                # node --test, sans appareil ni Metro
npm run previews:check  # celle qu'on oublie
npm run api:check       # dès qu'on touche au contrat
```

**`previews:check` est celle qu'on oublie, et c'est la seule que le CI attrapait vraiment.** Le
design system a **un seul sens** : les composants React Native sont la source de vérité, les
previews HTML en sont dérivées. Une preview qui bouge alors que personne ne l'a régénérée, c'est
une carte poussée vers Claude Design qui décrit un composant qui n'existe plus — et ça ne se
remarque nulle part ailleurs.

Et une sixième, qui ne se lance que quand un écran ou un enchaînement d'écrans a bougé : le smoke
test iOS sur Simulator (#122). Pendant l'implémentation, `npm run e2e:ios:dev` prépare une fois le
development build et Metro, puis `npm run e2e:ios:flow` rejoue le parcours sans rebuild natif.
Ce flow Metro et ses captures constituent la barrière mobile normale, y compris avant un push ou
une PR. `npm run e2e:ios:full` ne se lance jamais de manière autonome : seul l'utilisateur peut
demander explicitement cette validation Release. Un ticket important, un changement natif ou une
demande de terminer ne l'autorisent pas implicitement. La procédure complète vit dans
`docs/ai/mobile-qa.md`, la règle dans `AGENTS.md`. Un écran qu'on n'a pas vu tourner n'a pas été
vérifié, et les captures d'`artifacts/e2e/` sont là pour être lues, pas seulement produites.

`api:check` a le même rôle pour le contrat, dans l'autre sens : il retire `openapi.yaml` du
back et régénère `schema.d.ts`. Un diff, et c'est que le contrat a bougé sans qu'on le suive.

Les deux tests qui justifient à eux seuls `npm test` : « un seul rafraîchissement part » et
« la clé d'idempotence ne change pas entre deux tentatives ». Aucun des deux ne se voit à
l'œil — les deux issues affichent le même écran, et la mauvaise ne se manifeste qu'à
l'ouverture suivante, par une déconnexion ou une animation perdue.

## Ce qui n'est pas ici

- **Pas de Docker.** Contrairement au back, la chaîne Node/Expo tourne en local. C'est le seul
  point où les deux dépôts divergent sur la méthode, et c'est assumé : Expo pilote Xcode et un
  appareil physique, qu'un conteneur ne peut pas atteindre.
- **Pas de CI.** Voir la section ci-dessus : les barrières tournent avant le push, et c'est
  cette exécution-là qui fait foi.
- **Pas de secret versionné.** `EXPO_PUBLIC_API_URL` vit dans `.env.local`.
- **Pas de logique de jeu.** Aucun calcul d'XP, aucun tirage de loot, aucune règle de streak. Le
  client affiche ce que le serveur a décidé. Si une valeur manque pour animer, elle s'ajoute au
  `RewardSummary` côté back — elle ne se recalcule pas ici.
