# Al-Kasal : prototype de combat

Ticket : [#161](https://github.com/younesdiouri/grrind-app/issues/161).

Dans un bundle de développement, toucher **Essayer Al-Kasal** depuis la connexion ou l’onglet
Combat. L’atelier est aussi accessible par `/combat-demo` (schéma `grrindapp-dev` sur la variante
de développement, `grrindapp-e2e` sur le Simulator E2E). La route et les deux entrées sont gardées
par `__DEV__`. Le bouton Fermer fonctionne aussi après une ouverture directe par lien profond.

L’atelier montre les poses Repos, Attaque et Coup reçu à la même taille que leur aperçu, puis
propose une victoire ou une défaite. Les événements et les statistiques proviennent des fixtures
capturées existantes ; seule l’identité visuelle de l’adversaire est remplacée. Aucun combat
n’est envoyé au serveur, aucune récompense n’est créditée et le butin n’est pas affiché.

## Mise en scène

`BattleView` accepte une illustration optionnelle. Sans illustration, il conserve les rampes
historiques. Avec Al-Kasal, le contact arrive à 38 % de l’échange : le recul, le début du retrait
des PV, les dégâts et l’haptique partagent cet instant. Les trois images sont montées ensemble ;
le combat commence après leur chargement, et les opacités sont pilotées sur le thread UI par
l’horloge du combat. Les images ne se rechargent pas à chaque attaque.

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
le saut au bilan. Inspecter les captures dans `artifacts/e2e/` après chaque itération.

Le prototype ne remplace aucun adversaire réel. Son raccordement au catalogue demande la clé
définitive d’Al-Kasal ; il ne faut pas reconnaître un adversaire par son nom traduit.

Références : [Expo Image SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/image/),
[Reanimated SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/).
