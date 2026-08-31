# QA mobile iOS

Un agent qui change un écran ou un enchaînement d'écrans le valide lui-même avant de rendre la
main : il construit la variante E2E, la pilote sur un Simulator, lit les captures, corrige, et
relance. Cette page dit comment, sans rien supposer de la machine.

Le harnais s'appuie sur ce qui existe déjà — [Maestro](https://maestro.dev) pour piloter,
`HealthProvider` pour la santé, le back local pour les comptes. Il n'y a pas de framework maison
à apprendre : deux fichiers YAML, un script shell, un fournisseur bouchon.

## Prérequis

- Xcode et un runtime iOS Simulator compatibles avec Expo SDK 57 ;
- Java 17 ou plus récent (`brew install openjdk` ; le script retrouve ce JDK tout seul) ;
- Maestro (`brew install mobile-dev-inc/tap/maestro`) ;
- `grrind-back` qui répond sur `http://localhost:8080`.

Le test **crée** deux comptes jetables par exécution sur cette base. Il ne la réinitialise pas,
ne joue aucune migration, et ne touche pas au dépôt du back.

## Lancer

```bash
npm run test:e2e:ios
```

Le script fait tout, dans cet ordre : il vérifie les outils, crée les deux comptes, crée ou
retrouve le Simulator « GRRIND E2E », l'efface, construit la variante `app.grrind.e2e` en
Release, l'installe, vide le trousseau, puis joue `.maestro/ios-smoke.yaml`. Un échec sort en
code non nul.

**La boucle courte**, tant qu'on ne corrige qu'un sélecteur ou un enchaînement :

```bash
E2E_SKIP_BUILD=1 npm run test:e2e:ios
```

Elle réutilise l'app déjà installée et ne fait que rejouer le flow — quelques dizaines de
secondes au lieu de plusieurs minutes. **Dès qu'on touche au code de l'app, on relance sans ce
drapeau** : le bundle est figé dans le binaire (build Release, `--no-bundler`), une modification
non reconstruite n'est simplement pas testée.

Pour viser un autre back : `E2E_API_URL=http://…  npm run test:e2e:ios`.

## Choisir un scénario de santé

Le bundle E2E remplace HealthKit par `src/features/health/mockHealth.ts`. Le scénario se choisit
**sur l'adresse e-mail saisie à la connexion**, et le script en crée une de chaque :

| Adresse | Scénario | Ce que lit l'app |
| --- | --- | --- |
| contient `-empty-` | `empty` | aucune séance, aucune énergie active |
| toute autre | `multiple` | 4 séances (course, vélo, musculation) dont une hors fenêtre d'import |

Les dates sont **relatives à l'exécution** — *n* jours avant maintenant — et tout le reste est
figé : heures, durées, distances, calories, ordre. Deux exécutions à deux jours d'écart créditent
la même XP. Une date absolue, elle, serait sortie de la fenêtre d'import le lendemain.

Pour ajouter un scénario : une valeur dans `E2eHealthScenario`, un jeu de séances dans
`mockHealth.ts`, un cas dans `mockHealth.test.ts`. Le fournisseur de production n'est pas
concerné.

## Ce que le smoke test traverse

1. connexion avec le compte sans séance ;
2. accueil vide, puis onglet Santé sur « Aucune activité trouvée » ;
3. onglet Combat : le combattant du joueur en tête du catalogue, un combat gagné contre le
   seul adversaire accessible à un compte neuf (`SAND_JACKAL`, victoire garantie côté back),
   le bilan avec son butin, l'historique avec le gain ;
4. déconnexion depuis Réglages ;
5. relance de l'app, puis connexion avec le compte à séances ;
6. import des trois séances de la fenêtre et mise en scène jouée en entier ;
7. retour à l'accueil, historique à trois séances ;
8. le sac : l'entrée de l'accueil, puis l'ouverture depuis le bloc du combattant, la doublure
   et la bourse — et, **si le tirage a donné un objet**, l'équiper et voir le combattant avoir
   changé au retour.

L'étape 8 est la seule qui **dépend d'un tirage** : un objet ne tombe que trois fois sur dix
par séance créditée, donc environ deux exécutions sur trois en font tomber un. Ce qui est
certain — la bourse, les sept emplacements, le sac vide qui se nomme — se joue sans condition ;
l'équipement vit dans un `runFlow` conditionnel, et son absence ne fait pas échouer le flow.
Pour l'obtenir à coup sûr, on relance en boucle courte jusqu'à ce que `11-fighter-after-equip`
paraisse : c'est la capture qui prouve, sur **le même compte**, que l'armure est passée de
0 % à 2 % sans qu'on ait rechargé quoi que ce soit à la main.

## Les captures

`artifacts/e2e/` — ignoré par Git. On y trouve les captures explicites du flow
(`01-empty-home` … `11-fighter-after-equip`), le rapport JUnit `report.xml`, et pour chaque
exécution un dossier horodaté avec la capture, la **hiérarchie d'accessibilité** et les journaux
de l'étape qui a échoué.

**Les regarder fait partie du travail.** Un flow vert ne dit pas qu'un écran est juste : il dit
qu'on y est arrivé.

## Lire un échec

La hiérarchie JSON du dossier horodaté dit ce que Maestro a vu, et c'est presque toujours la
réponse. Quatre pièges connus, tous déjà payés :

- **Le texte se compare en entier.** `"Accueil"` ne trouve pas l'onglet dont iOS a composé le
  libellé en « Accueil, tab, 1 of 5 ». Les onglets se visent donc par `id` (`tab-accueil`,
  `tab-sante`, `tab-combat`, `tab-guilde`, `tab-reglages`), posés par `tabBarButtonTestID`.
  Ailleurs, un `.*` explicite là où le libellé porte plus que ce qu'on cherche.
- **L'écran de récompense, et l'écran de combat, sont chacun un seul élément d'accessibilité.**
  Les deux enveloppent tout leur contenu dans un `Pressable` racine, qui agrège ses enfants en
  une phrase. On y cherche des fragments (`".*Toucher pour continuer.*"`, `".*Victoire.*"`),
  jamais un texte exact — et un `tapOn: point:` plutôt qu'un `tapOn:` sur un libellé, puisqu'il
  n'y a rien à cibler individuellement dedans.
- **`clearState` ne déconnecte pas.** Le jeton de rafraîchissement vit dans le trousseau
  (invariant n°3), qui survit à l'effacement du conteneur de données. Le script fait
  `xcrun simctl keychain <udid> reset` ; en pilotant Maestro à la main, il faut le faire aussi,
  sinon la session du passage précédent est encore là.
- **Deux singletons de module survivent à la déconnexion**, et le flow relance donc l'app entre
  ses deux scénarios. Le coordinateur refuse une synchronisation dans les trente secondes qui
  suivent la précédente, et `markInteracted` décide si la récompense a le droit de prendre
  l'écran. Enchaîner deux sessions dans le même processus rend l'import du second compte
  dépendant du temps qu'a pris le premier scénario — et rien ne le dit.
- **La récompense prend l'écran d'elle-même après une connexion**, parce que le formulaire vit
  hors de la coquille de l'app : y taper n'appelle pas `markInteracted`, donc `mayOpenReward`
  laisse passer. Elle recouvre l'accueil : l'historique se vérifie **après** l'avoir refermée,
  jamais avant.

Si le flow échoue avant même le build : `curl http://localhost:8080/health`, `maestro --version`,
et le JDK.

## Avant de considérer un ticket mobile terminé

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run previews:check` ;
- `npm run test:e2e:ios` **complet** (sans `E2E_SKIP_BUILD`) au vert ;
- les captures d'`artifacts/e2e/` ouvertes et lues, pas seulement produites ;
- un flow ou une assertion ajoutés si le ticket a ouvert un écran que le smoke test ne traverse
  pas.

## Ce qui ne tourne pas en CI

Il n'y a pas de CI dans ce dépôt (#85) : les barrières tournent avant le push, et c'est cette
exécution-là qui fait foi. Le E2E iOS ne fait pas exception, et il aurait de toute façon les
pires raisons d'y aller — il lui faut Xcode, un Simulator, et un `grrind-back` joignable, c'est-
à-dire trois choses qu'un runner jetable devrait reconstruire à chaque fois pour rejouer, plus
lentement, ce qu'on vient de lancer en local.
