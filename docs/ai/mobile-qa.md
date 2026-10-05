# QA mobile iOS

La boucle quotidienne utilise un development build déjà installé et Metro. On valide le
comportement changé, puis on regarde les captures. Les règles communes sont dans `AGENTS.md`.

## Prérequis

Xcode et un runtime iOS compatibles SDK 57, Java 17+ (`brew install openjdk`), Maestro
(`brew install mobile-dev-inc/tap/maestro`). Pour les flows authentifiés, le back doit répondre
sur `http://localhost:8080`. Le harnais crée des comptes jetables via l’API : il ne réinitialise
jamais cette base, ne joue aucune migration et ne modifie pas le dépôt du back.

## Deux variantes utiles, une seule boucle Metro

- **GRRIND dev** : iPhone réel, vraie santé, permissions, widget, sons et haptique.
- **GRRIND E2E** : Simulator dédié, comptes isolés et fournisseur santé simulé.

Les variantes ont des bundle IDs, schémas de liens et App Groups distincts. Le projet généré
`ios/` est partagé ; il ne faut pas construire le workspace d’une autre variante. `npm run ios`
calcule l’empreinte dev et régénère le projet lorsque la configuration ou la variante diffère.
`npm start` charge le JS de développement sans reconstruire le natif.

```sh
npm run e2e:ios:dev
npm run e2e:ios:flow -- .maestro/ios-smoke.yaml
```

`dev` réutilise le Simulator « GRRIND E2E », l’app installée et Metro (8082). Il ne compile en
Debug que si le binaire manque, si son empreinte native change ou avec `E2E_FORCE_BUILD=1`.
L’empreinte officielle Expo suit la configuration résolue, les plugins, les dépendances
natives autolinkées et les sources natives, avec les sources du widget `targets/` en complément.
Elle ignore les scripts npm, les changements JS ordinaires et le lockfile pris globalement.
Changer une dépendance native ou un plugin reste détecté. La régénération utilise `prebuild --clean` uniquement dans ce cas natif, pour éviter les
restes de plugins ; elle ne nettoie ni DerivedData ni DeviceSupport. L’introduction de cette nouvelle
empreinte peut nécessiter une reconstruction initiale ; ne pas fabriquer une empreinte pour
faire passer un ancien binaire pour neuf.

Lorsque `dev` démarre Metro, le terminal reste ouvert. Lancer les flows depuis un autre terminal.
Un Metro reconnu est réutilisé ; un processus inconnu sur le même port n’est jamais tué.

`flow` ne compile rien et n’efface ni ne redémarre le Simulator. Il vérifie Metro et le back,
crée le compte requis, remet à zéro l’état de l’app et le Keychain du Simulator dédié, puis joue
Maestro. Le code de sortie signale l’échec. Ne pas utiliser ce reset sur un Simulator partagé.

## Choisir une vérification

| Changement | Vérification mobile |
| --- | --- |
| Présentation d’un écran | Un atelier/flow existant adapté, captures inspectées |
| Navigation commune / intégration | `ios-smoke.yaml` : connexion, accueil, un combat, retour |
| Santé, import, récompense, diagnostics | `health-sync.yaml` : empty puis multiple |
| Combat serveur, historique et rejeu | `combat-real.yaml` |
| Postures et effets du combat | `combat-v2.yaml` ou l’atelier concerné |
| Inventaire et profil public | `inventory-profile.yaml`, puis actions seulement si modifiées |
| Guilde/chat | Le flow correspondant au comportement changé |
| Scripts du harnais uniquement | `npm run test:ios:tools`, puis un flow si sa conduite change |
| Documentation / tests seuls | Aucun Simulator ni build |

Un flow pertinent après une modification cohérente suffit. Une capture existante peut servir
avant modification ; ne rejouer une baseline que pour reproduire un bug ou obtenir une référence
manquante. Après un passage vert, ne pas relancer sans changement, échec ou doute précis.
Les flows partagés sont réutilisés, pas tous exécutés à chaque ticket. Ne pas modifier le bundle
pendant Maestro : même un commentaire dans un module de mock peut le réévaluer et réinitialiser
son état par Fast Refresh. Terminer les changements avant de lancer la vérification.

Le smoke utilise un compte `empty`. `health-sync` en utilise deux car il vérifie réellement les
deux scénarios : l’adresse contenant `-empty-` n’a aucune activité ; l’autre présente quatre
séances, dont trois importables et une hors fenêtre. Les dates sont relatives à l’exécution.
Les comportements boutique/vente/équipement ont leurs flows dédiés ; pas de retry jusqu’à obtenir
un loot aléatoire. Ne pas assimiler une branche conditionnelle jamais jouée à une preuve.

Pour une scène autonome, ou un flow documenté qui doit conserver la session QA :

```sh
E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/al-kasal.yaml
```

Ce drapeau supprime la vérification du back, la création de comptes et le reset, pas les éventuels
appels réseau de l’app. Il ne remplace pas le smoke authentifié.

Pour changer les ports, garder les mêmes paramètres sur `dev` et `flow` :

```sh
E2E_API_URL=http://localhost:8090 E2E_METRO_PORT=8083 npm run e2e:ios:dev
E2E_API_URL=http://localhost:8090 E2E_METRO_PORT=8083 npm run e2e:ios:flow
```

## Quand reconstruire

JS/TS, styles, animations, navigation, API, fournisseurs JS et YAML : **aucun rebuild**.
Modules/dépendances natifs, Swift/Objective-C, plugins, entitlements, HealthKit, icônes/polices
embarquées par plugins : **rebuild Debug de la variante concernée**. En cas de modification native
directe hors sources générées, `E2E_FORCE_BUILD=1 npm run e2e:ios:dev` force ce rebuild.

Le clean Release local `e2e:ios:full`, son alias et `E2E_SKIP_BUILD` ont été retirés. Ne pas les
remplacer par un autre effacement/Release automatique. Un candidat de production se construit
lors d’une livraison explicitement cadrée, puis se vérifie sur iPhone/TestFlight : démarrage,
session, HealthKit/permissions, widget, push, arrière-plan et performance selon le changement.
Les simulations E2E ne prouvent pas ces intégrations réelles. EAS ne part pas à chaque fusion.

## Rapports, disque et processus

Maestro écrit désormais sorties et logs globaux dans `artifacts/e2e/`, le reset dans
`artifacts/e2e/reset/`. Le rapport JUnit `report.xml` décrit le dernier flow. Après une exécution,
y compris échouée, seuls les **cinq derniers dossiers horodatés** et **le dernier reset** restent.
Cette limite de nombre n’est pas une limite stricte d’octets : un run bloqué peut produire un gros
log. Diagnostiquer ce run, puis nettoyer son historique ; ne pas conserver des dizaines de reprises.

```sh
npm run e2e:ios:clean
# Exception ponctuelle : épingler un dossier avant qu’il ne sorte de l’historique.
touch artifacts/e2e/<dossier-horodate>/.keep
```

`.keep` conserve une preuve utile, pas toute une campagne. Pour une preuve durable, conserver
quelques captures choisies dans la documentation plutôt que tous les journaux du run.
Le nettoyage ne touche pas `artifacts/e2e/dev/` (empreinte, PID/configuration Metro), les fixtures,
les autres dossiers de travail, les caches Xcode ou les journaux Maestro d’autres projets.
Les anciens rapports GRRIND dans `~/.maestro/tests` peuvent être retirés une fois identifiés ;
aucun nettoyage automatique global de ce dossier partagé.

Les tests unitaires et Maestro terminés ne restent pas en RAM. Metro, Xcode et le Simulator
restent actifs pour accélérer la boucle. À la fin d’une séance E2E : `Ctrl+C` dans son terminal,
puis `xcrun simctl shutdown "GRRIND E2E"` si le Simulator n’est plus utilisé. Préserver le Metro
qui sert l’app du téléphone. Ne pas tuer tous les processus Node.

Conserver `~/Library/Developer/Xcode/iOS DeviceSupport` pour l’iOS actuel du téléphone : ce sont
les symboles système copiés/extraits lors de sa préparation. Conserver DerivedData pour les
compilations incrémentales et l’index du projet. Pods, app installée et runtime Simulator se
réutilisent aussi. Les vider systématiquement transforme de l’espace récupéré en attente.
Les nettoyages de caches et du jumelage ne sont jamais une étape normale de QA.

## Lire un échec et terminer

Lire la hiérarchie d’accessibilité et les captures du dernier dossier horodaté. Les onglets se
ciblent par `id` (`tab-combat`, etc.), les textes agrégés par fragments `.*`. Le retour paysage →
portrait doit être observé avant de réorienter le pilote, pour ne pas masquer une régression.
`clearState` ne vide pas le Keychain ; le reset dédié le fait. Après reset, « Continue » / « Close »
du dev-client se ferment conditionnellement. Entre les deux comptes santé, relancer le processus
réinitialise les singletons ; aucun reboot/second clearState n’est nécessaire.

Avant push : typecheck, lint et unit tests une fois sur le code final. Previews seulement si le
rendu/tokens change, API seulement si le contrat change, outils iOS si le harnais change. Pour un
écran/parcours modifié, le flow pertinent doit être vert et ses captures réellement inspectées.
Ne pas ajouter de tests qui recopient la logique testée ou figent des détails décoratifs.
