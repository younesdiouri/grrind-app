# QA mobile iOS

Un agent qui change un écran ou un enchaînement d'écrans le valide lui-même avant de rendre la
main : il construit la variante E2E, la pilote sur un Simulator, lit les captures, corrige, et
relance. Cette page dit comment, sans rien supposer de la machine.

Le harnais s'appuie sur ce qui existe déjà — [Maestro](https://maestro.dev) pour piloter,
`HealthProvider` pour la santé, le back local pour les comptes. Il n'y a pas de framework maison
à apprendre : des flows YAML, de petits scripts shell, un fournisseur bouchon.

## Prérequis

- Xcode et un runtime iOS Simulator compatibles avec Expo SDK 57 ;
- Java 17 ou plus récent (`brew install openjdk` ; le script retrouve ce JDK tout seul) ;
- Maestro (`brew install mobile-dev-inc/tap/maestro`) ;
- `grrind-back` qui répond sur `http://localhost:8080`.

Le test **crée** deux comptes jetables par exécution sur cette base. Il ne la réinitialise pas,
ne joue aucune migration, et ne touche pas au dépôt du back.

## Les deux modes

Le harnais sépare explicitement l'itération JS/TS de la validation native. La première s'appuie
sur un **development build E2E** contenant les mêmes modules natifs que l'app et charge le code
depuis Metro. La seconde conserve le build Release propre historique.

### Boucle de développement rapide

```bash
npm run e2e:ios:dev
npm run e2e:ios:flow
```

`e2e:ios:dev` prépare ou réutilise le Simulator « GRRIND E2E », le development build
`app.grrind.e2e` et un Metro E2E sur le port 8082. Le premier passage — ou un changement natif —
peut faire un prebuild non destructif et un build Debug. Les passages suivants vérifient
l'empreinte native, réutilisent l'app installée et Metro, puis sortent sans build. Cette
préparation fonctionne même si le back est momentanément arrêté ; seul le flow en dépend.
Quand la commande démarre Metro, elle reste ouverte comme un `expo start` normal : conserver ce
terminal — ou cette session d'agent — et lancer les flows depuis un autre. `Ctrl+C` arrête Metro.

`e2e:ios:flow` crée deux comptes neufs, remet à zéro l'état ciblé, rouvre le bundle Metro et joue
`.maestro/ios-smoke.yaml`. Il ne lance ni `expo prebuild`, ni Xcode, ni effacement, ni reboot du
Simulator. Les assertions, captures et le rapport JUnit sont les mêmes que dans le mode complet.
Un échec sort en code non nul.

Pendant une modification d'écran :

1. lancer `npm run e2e:ios:dev` une fois ;
2. lancer `npm run e2e:ios:flow` et lire les captures de départ ;
3. modifier le JS/TS et laisser Fast Refresh mettre l'app à jour ;
4. relancer seulement `npm run e2e:ios:flow` ;
5. lire les assertions et captures, corriger, puis répéter.

On peut viser un autre flow sans modifier le script :

```bash
npm run e2e:ios:flow -- .maestro/mon-flow.yaml
```

Pour viser un autre back ou un autre port Metro, passer les mêmes valeurs aux deux commandes :

```bash
E2E_API_URL=http://… E2E_METRO_PORT=8083 npm run e2e:ios:dev
E2E_API_URL=http://… E2E_METRO_PORT=8083 npm run e2e:ios:flow
```

### Validation complète

```bash
npm run e2e:ios:full
```

`npm run test:e2e:ios` reste un alias compatible vers cette validation. Le script vérifie les
outils et le back, crée les comptes, crée ou retrouve le Simulator, l'arrête et l'efface,
exécute `expo prebuild --clean`, construit la variante E2E en Release, l'installe, remet l'état à
zéro, puis joue le smoke test.

Ce mode est la validation de référence : une fois avant de terminer un ticket mobile important,
après un changement natif/configuration, ou dès que l'environnement rapide paraît obsolète.
Comme le build Release et le development build partagent l'identifiant E2E, le full remplace le
development build ; le prochain `e2e:ios:dev` le reconstruira une seule fois.

L'ancien `E2E_SKIP_BUILD=1 npm run test:e2e:ios` reste disponible pour rejouer un bundle Release
déjà installé, notamment sur une ancienne session. Il ne voit pas les changements JS/TS : la
boucle Metro est désormais la voie normale.

### Quand reconstruire l'app native

| Changement | Rebuild natif |
| --- | --- |
| `.ts` / `.tsx` | Non |
| styles React Native | Non |
| logique d'animation JS | Non |
| appels API | Non |
| navigation côté JS | Non |
| mock/provider côté JS | Non |
| YAML Maestro | Non |
| Swift / Objective-C | Oui |
| module natif | Oui |
| nouvelle dépendance native | Oui |
| plugin de configuration Expo | Oui |
| `app.config.*` qui affecte le natif | Oui |
| entitlements / capacité HealthKit | Oui |

`e2e:ios:dev` compare une empreinte des fichiers de configuration, dépendances et sources iOS du
module Santé. En cas de modification native directe non détectée, forcer la reconstruction sans
effacer le Simulator :

```bash
E2E_FORCE_BUILD=1 npm run e2e:ios:dev
```

### Réinitialisation déterministe sans effacer le Simulator

Chaque flow rapide utilise trois niveaux minimaux :

- `clearState` vide le conteneur de `app.grrind.e2e` ;
- `simctl keychain … reset` vide le Keychain du Simulator GRRIND E2E, requis parce que le refresh
  token est dans `expo-secure-store` ;
- deux comptes neufs sont créés sur le back, sans réinitialiser sa base ni jouer de migration.

Après `clearState`, `expo-dev-client` réaffiche son onboarding natif « Continue », puis ouvre le
panneau Dev Menu. Le smoke test ferme conditionnellement les deux avant la connexion ; la branche
n'existe visuellement pas dans le build Release et n'altère donc pas la validation complète.

Le development build reste installé, le Simulator reste démarré et Metro reste vivant. Entre les
deux comptes du smoke test, une déconnexion suivie d'un simple redémarrage du processus suffit à
réinitialiser les singletons JS ; aucun second `clearState` ni reboot n'est nécessaire.

Le reset du Keychain porte sur tout le Simulator, raison pour laquelle le harnais utilise un
Simulator dédié. Si un futur scénario doit préserver une session ou tester précisément le
Keychain, il devra employer un flow dédié et documenter son propre reset ; il ne faut pas retirer
celui du smoke test par défaut.

### Temps attendu

Le mode full comprend un prebuild clean, toute la compilation Xcode et le flow : il prend
plusieurs minutes sur cette machine. Après la préparation initiale, un changement `.tsx` utilise
le bundle Metro puis le flow seul. Mesures observées le 31 août 2026 : 1 à 3 secondes pour
réutiliser le Simulator, le development build et Metro déjà prêts ; 1 min 46 à 1 min 56 pour le
smoke Maestro complet (environ 2 min 17 au total avec création des comptes et reset ciblé), sans
aucune compilation native. Les scripts affichent leur durée finale afin de garder cette différence
observable.

Si `e2e:ios:flow` fait apparaître une compilation Xcode ou `expo prebuild`, le fast loop est cassé.
Il doit seulement vérifier Metro, réinitialiser l'état ciblé et lancer Maestro.

Pour arrêter Metro volontairement, faire `Ctrl+C` dans le terminal `e2e:ios:dev`. Son PID est
aussi écrit dans `artifacts/e2e/dev/metro.pid` pour le diagnostic. Le harnais ne tue pas
automatiquement un processus inconnu qui occuperait le port 8082.

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
Il ne faut pas relancer le smoke jusqu'à avoir de la chance : la branche d'équipement reste une
couverture opportuniste, pas une preuve déterministe. Une validation fiable de cette branche
demandera un compte E2E avec objet préchargé ou une fixture back dédiée ; jusque-là, la capture
`11-fighter-after-equip` n'est produite que lorsqu'un objet est réellement tombé.

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
- `npm run e2e:ios:full` au vert ;
- les captures d'`artifacts/e2e/` ouvertes et lues, pas seulement produites ;
- un flow ou une assertion ajoutés si le ticket a ouvert un écran que le smoke test ne traverse
  pas.

## Ce qui ne tourne pas en CI

Il n'y a pas de CI dans ce dépôt (#85) : les barrières tournent avant le push, et c'est cette
exécution-là qui fait foi. Le E2E iOS ne fait pas exception, et il aurait de toute façon les
pires raisons d'y aller — il lui faut Xcode, un Simulator, et un `grrind-back` joignable, c'est-
à-dire trois choses qu'un runner jetable devrait reconstruire à chaque fois pour rejouer, plus
lentement, ce qu'on vient de lancer en local.
