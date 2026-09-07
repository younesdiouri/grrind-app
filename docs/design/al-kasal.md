# Al-Kasal : prototype de combat

Ticket : [#161](https://github.com/younesdiouri/grrind-app/issues/161).

Dans un bundle de développement, l’atelier reste accessible depuis la connexion ou par
`/combat-demo` (schéma `grrindapp-dev` sur la variante de développement, `grrindapp-e2e` sur le
Simulator E2E). La route et l’entrée de connexion sont gardées par `__DEV__`. Le raccourci
« Essayer Al-Kasal » a été retiré du catalogue Combat, qui utilise maintenant les données réelles. Le bouton Fermer fonctionne aussi après une ouverture directe par lien profond.

L’atelier montre les poses Repos, Attaque et Coup reçu à la même taille que leur aperçu, puis
propose une victoire ou une défaite. Les événements et les statistiques proviennent des fixtures
capturées existantes ; seule l’identité visuelle de l’adversaire est remplacée. Aucun combat
n’est envoyé au serveur, aucune récompense n’est créditée et le butin n’est pas affiché.

## Mise en scène

`BattleView` lit `battle.enemy.imageUrls` (`idle`, `attack`, `hit`) et `introduction` du contrat
livré par [grrind-back#267](https://github.com/younesdiouri/grrind-back/pull/267). Le POST et le
détail relu depuis l’historique passent par ce même composant, sans mapping de nom ni recherche
dans le catalogue courant. L’atelier local conserve une illustration explicite de démonstration.

Sans illustration, il conserve les rampes
historiques. Avec Al-Kasal, le contact arrive à 38 % de l’échange : le recul, le début du retrait
des PV, les dégâts et l’haptique partagent cet instant. Les trois images sont montées ensemble ;
les opacités sont pilotées sur le thread UI par l’horloge du combat. Les images ne se rechargent
pas à chaque attaque.

Après le chargement, Al-Kasal entre en 850 ms avec un fondu, une montée et un léger changement
d’échelle. Une bulle apparaît : « je suis la paresse, laissez tomber, ce jeu n'est pas fait pour
vous. » Il respire doucement pendant la lecture. Le premier toucher ferme la bulle et lance
le combat ; les PV restent intacts jusque-là. Les touchers suivants permettent le saut au bilan.
L’entrée, la respiration et le combat réutilisent la même horloge ; quitter l’écran l’arrête.
Avec la réduction des animations, le dialogue apparaît directement, sans déplacement.

Un dialogue sans images fonctionne aussi. Un pack sans dialogue joue son entrée puis démarre
automatiquement. Les images utilisent le cache mémoire/disque ; les trois poses doivent être
chargées avant l’entrée. Au premier échec ou après huit secondes d’attente, la scène repart sans
sprite avec la réplique éventuelle ; le résultat serveur reste accessible. Une nouvelle bataille
remonte une nouvelle scène. Les anciennes réponses sans champs de présentation restent valides.

L’esquive utilise la pose de repos avec une inclinaison latérale. La réduction des animations
supprime les déplacements et les flashes ; le saut au bilan ne déclenche pas les impacts restants.
Les illustrations quittent la scène au verdict pour laisser le bilan lisible.

Les PNG sont dans `assets/images/enemies/al-kasal/`. La pose originale validée par l’utilisateur
est conservée séparément dans `output/imagegen/al-kasal-idle-v1.png` sur son espace de travail.
Les deux autres poses ont été générées par l’outil ImageGen intégré à partir de cette référence :
attaque lourde avec un bras lancé vers l’avant, puis recul du torse avec les bras écartés.

## Vérification iOS

```sh
npm run e2e:ios:dev
E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/al-kasal.yaml
```

Le mode hors ligne ne crée pas de comptes et ne réinitialise ni le conteneur de l’app ni le
trousseau. Il est destiné aux démonstrations autonomes ; le smoke habituel continue à exiger le
backend. Le flow vérifie les trois poses, une victoire, une défaite, le retour à l’atelier et
le dialogue initial, le démarrage au premier toucher et le saut au bilan. Inspecter les captures
dans `artifacts/e2e/` après chaque itération.

Le flow `combat-real.yaml` vérifie un combat réel et son rejeu depuis l’historique ; cette même
séquence est réutilisée par `ios-smoke.yaml` :

```sh
npm run e2e:ios:flow -- .maestro/combat-real.yaml
```

Pour exercer les variantes réseau de manière reproductible sans modifier le catalogue :

```sh
node scripts/combat-presentation-server.mjs
# Dans un second terminal, Metro E2E déjà prêt :
E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/combat-presentation.yaml
```

Ce serveur de test local sur le port 8099 sert une copie synthétique de la présentation sur une
timeline capturée : trois vrais téléchargements PNG, dialogue seul, HTTP 404, réponse retardée
au-delà de huit secondes, pack sans dialogue et ancienne réponse. Les URLs de scénario ne sont
pas des données de production. Leur entrée dans l’atelier exige `__DEV__` et le bundle E2E.

Le raccordement est générique : un mob publié avec ces champs les utilise dès son prochain combat
ou rejeu. L’activation et l’équilibrage d’Al-Kasal dans le catalogue réel restent des opérations
de contenu dans le backend ; l’atelier ne remplace aucun adversaire réel.

Références : [Expo Image SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/image/),
[Reanimated SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/).
