# Chat privé de guilde (#170)

Le contrat est tiré de `grrind-back` au commit
`fd1c2ba5abea2529302731ec9f3745e922ddec73` (PR #276, issue #275).
La livraison mobile dépend de la fusion et du déploiement de ce backend, avec Mercure
et le stockage privé configurés. Cette PR mobile ne déploie rien.

```sh
GRRIND_API_REF=fd1c2ba5abea2529302731ec9f3745e922ddec73 npm run api:pull
npm run api:generate
GRRIND_API_REF=fd1c2ba5abea2529302731ec9f3745e922ddec73 npm run api:check
```

La conversation conserve ses messages et son brouillon uniquement pendant son ouverture.
Fermer le chat abandonne le brouillon ; un envoi échoué reste réessayable tant qu'on y reste.
Chaque modification crée une nouvelle intention. Un réessai réutilise l'intention et le JPEG
préparé. Le curseur de rattrapage n'avance pas sur la réponse d'un envoi, afin de ne pas sauter
les messages écrits entre-temps par un autre membre.

Le SSE natif utilise le streaming `expo/fetch` et le jeton Mercure en Authorization. Il
déclenche uniquement un rattrapage HTTP. Le renouvellement précède l'expiration de 30 secondes,
et l'app active rattrape aussi toutes les 30 secondes pour tolérer une panne du hub. L'app
en arrière-plan ferme le SSE et les timers, puis se réabonne au retour. Les refus de guilde
ferment le périmètre et les réponses tardives sont ignorées.

La photothèque utilise le picker système iOS, qui ne demande pas l'accès complet à la
bibliothèque sur les versions iOS supportées. La caméra n'est pas appelée. Le codec natif
prépare un JPEG de 1 600 pixels maximum sur le grand côté, compression 0,8, vérifié sous
5 Mio ; l'original temporaire est supprimé. Le fichier préparé est supprimé après succès,
remplacement ou fermeture. Le répertoire dédié est aussi purgé au démarrage et à la déconnexion, y compris après un arrêt du processus. Seuls les fichiers du cache de l'app peuvent être supprimés.

Sources SDK 57 consultées avant implémentation :
- https://docs.expo.dev/versions/v57.0.0/sdk/expo/#expofetch-api
- https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/
- https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/
- https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/
- https://docs.expo.dev/versions/v57.0.0/sdk/image/

## QA locale

`node scripts/seed-chat-qa.mjs` crée trois comptes jetables via l'API publique locale, une
guilde, 55 messages, puis fait partir un auteur. Il ne migre ni ne réinitialise la base.
Les comptes de QA restent dans `artifacts/e2e/chat-qa.json`, ignoré par Git. Ne pas publier ce
fichier. Le flow chat utilise `MAESTRO_CHAT_EMAIL` et `MAESTRO_CHAT_PASSWORD` de son champ `env`.

Préparer le development build avec `npm run e2e:ios:dev`, puis lancer
`npm run e2e:ios:flow -- .maestro/guild-chat.yaml` avec ces variables. Ne pas lancer la
validation Release sans demande explicite. Android et les appareils physiques sont hors de
cette QA ; tester notamment HEIC/orientation et retour d'arrière-plan sur un vrai iPhone
avant distribution.

### Environnement natif de cette QA

L'ajout du picker et du préparateur de photos nécessite un development build. Le premier
build Debug a compilé, mais le binaire a arrêté au lancement : `ExpoModulesWorklets`
précompilé référençait un `React.framework` absent dans cet environnement compilant RN
depuis les sources. Les dépendances ont été régénérées de manière cohérente pour cette QA :

```sh
(cd ios && EXPO_USE_PRECOMPILED_MODULES=0 RCT_USE_PREBUILT_RNCORE=0 RCT_USE_RN_DEP=0 pod install)
EXPO_USE_PRECOMPILED_MODULES=0 RCT_USE_PREBUILT_RNCORE=0 RCT_USE_RN_DEP=0 E2E_FORCE_BUILD=1 npm run e2e:ios:dev
```

Ces variables ne changent pas la configuration de livraison. `cmake` était absent de la
machine et a été installé pour compiler Hermes. Le simulateur dédié a été redémarré
sans effacement après un blocage de ses services d'installation.

### Réponse perdue et Mercure

`node scripts/chat-qa-proxy.mjs` ouvre un relais **uniquement local** sur le port 8090.
Utiliser `E2E_API_URL=http://localhost:8090 E2E_METRO_PORT=8083 npm run e2e:ios:dev`, puis
les mêmes variables pour les flows. Le relais utilise la vraie API, réécrit seulement
l'URL du hub vers lui-même, et ne journalise aucun jeton ni contenu de message.

- `POST http://localhost:8090/__qa/lose-next-send` masque la prochaine réponse d'envoi
  réussie avec un 503 : le message existe déjà côté serveur avant le réessai.
- `POST http://localhost:8090/__qa/toggle-hub` coupe/rétablit le hub, tout en laissant
  l'historique HTTP disponible.
- `node scripts/chat-qa-peer.mjs 'Texte de QA'` envoie depuis le fondateur.
- `node scripts/chat-qa-peer.mjs --exclude` exclut le compte spectateur de la guilde de QA.

Les traces horodatées restent dans `artifacts/e2e/chat-network.jsonl`. Pour poursuivre
un flow avec le compte courant, passer aussi `E2E_OFFLINE=1` : cette option du harness
évite le reset de session ; l'app continue bien à appeler l'API réelle via le relais.

### Résultats de la QA du 9 septembre 2026

- Flow texte/clavier `2026-09-09_193112` : réussi, captures inspectées.
- Flow photo `2026-09-09_194001` : aperçu, envoi seul et affichage privé réussis ;
  POST 201 puis GET image 200 sur la vraie API, signal Mercure reçu. JPEG préparé
  1 600 × 1 200, 883 940 octets, cache dédié vide après succès.
- La QA a reproduit puis corrigé une différence SDK 57 : `File.move()` retourne
  une promesse ; attendre sa résolution avant de transmettre la nouvelle URI.
- Flow réessai `2026-09-09_194051` : réponse 201 volontairement masquée par le relais ;
  les deux tentatives ont la même empreinte de corps, une seule ligne côté serveur.
  La première réception via SSE peut afficher le message avant confirmation HTTP ;
  le réessai confirme alors cet envoi sans doublon.
- Partenaire réel `2026-09-09_194147` : signal à 17:41:46.790Z et historique à
  17:41:46.838Z ; nouveau message visible. Arrière-plan : SSE fermé, message envoyé
  pendant la pause, réabonnement et rattrapage au retour (`2026-09-09_194204`).

Les flows photo/historique/réessai supposent le compte de QA déjà connecté. Le flow réessai
nécessite d’armer `/__qa/lose-next-send` avant son lancement. La photothèque du simulateur
doit contenir une image dans la première rangée (le flow sélectionne la vignette centrale).
Le deep-link du harness peut recharger le JS ; pour tester un vrai arrière-plan sans relance,
Maestro a piloté la session déjà ouverte avec `pressKey: Home` puis
`launchApp: { stopApp: false }`.

La remontée réelle jusqu’à « Historique 01 » a été vérifiée et inspectée
(`2026-09-09_194434`). Maestro signale une mauvaise coordonnée d’accessibilité pour le
bouton dans la liste inversée ; le flow atteint la butée puis touche sa position visuelle.
Les tests unitaires couvrent aussi le rattrapage sur plusieurs pages et la reprise au
dernier curseur validé après une coupure.

Le scénario photo + texte a également déclenché un vrai refresh (401, refresh 200,
rejeu 201). Il a exposé une incompatibilité SDK 57 : `expo/fetch` rend un
`FetchResponse`, alors qu’`openapi-fetch` exige le constructeur global `Response`
pour le résultat d’un middleware. Le middleware normalise désormais cette seule
réponse de rejeu ; le coordinateur de refresh et sa sérialisation sont inchangés.
Le test de régression échouait avec le même message que sur iOS avant correction.
Le relais fournit aussi `/__qa/expire-next-send` pour reproduire le refus initial.

Le parcours photo + texte avec retrait/resélection, expiration forcée, refresh réel,
réponse perdue et réessai passe après correction (`2026-09-09_194918`, 74 s).
Deux intentions de QA distinctes ont produit exactement deux messages photo côté serveur.
Le flow refresh texte passe aussi sur le code final (`2026-09-09_195053`, 36 s) :
401 simulé par le relais, refresh réel 200, rejeu réel 201, brouillon vidé.
TypeScript, lint et 543 tests passent après le correctif ; previews:check et api:check
avaient passé sur le même contrat et les mêmes composants.

Enfin, l’exclusion réelle du membre ayant un brouillon et une photo a rendu un 404
à 17:52:34.035Z, puis fermé le SSE à 17:52:34.046Z. Le flow vérifie la disparition
du chat, du brouillon et des images ; le répertoire dédié ne contient plus aucun fichier
(alors qu’un JPEG de 883 940 octets existait juste avant).

Les vérifications réelles ne remplacent pas la QA physique HEIC/orientation ou Android,
qui restent à effectuer. Aucun reset, migration ou changement du dépôt backend n’a été fait.
