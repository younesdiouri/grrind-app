# Outils et essai iPhone

## Préparer une session de production

Vérifier les outils effectivement exposés par la session et `rtk proxy claude mcp list` si
elle utilise la configuration Claude. Cette liste ne rend pas leurs outils automatiquement
disponibles dans un autre client. Pour Meshy : vérifier la connexion et le solde avant le
premier appel payant, lire le schéma et annoncer son coût. Aucune génération pour un test de setup.

Privilégier le MCP direct. En son absence, employer le client CLI livré de
`@modelcontextprotocol/inspector` avec la configuration du serveur, selon son `--cli --help`.
Passer la clé dans le bloc `env` du serveur : l’héritage de l’environnement du client n’avait
pas transmis la clé Meshy pendant #343. Ne pas afficher la clé, la copier dans le dépôt ou
écrire un client API maison. Une configuration temporaire contenant un secret est privée et
supprimée après l’appel. Le format de travail GLB puis export FBX est déjà déterminé pour Unity.

Pour Unity, vérifier l’état du bon projet avec la CLI officielle. Le lancement CLI a pu sortir
avant connexion dans #343 ; après diagnostic, l’ouverture de l’application a fonctionné :

```sh
rtk proxy open -a <chemin-vers-Unity.app> --args -projectPath <repo>/spikes/Unity3D
```

Respecter l’éditeur de l’utilisateur et les autres checkouts. Blender headless peut exécuter
les scripts versionnés lorsqu’aucune session MCP Blender n’est disponible.

## Livrer l’essai

Suivre `docs/ai/mobile-qa.md`. Un changement JS utilise le Metro 8081 et le development build
installé. Une nouvelle donnée Unity embarquée nécessite la tranche **Device** puis l’app hôte ;
préserver la tranche Simulator, les caches et le Metro du téléphone. Aucun EAS pour un pilote.

Si Expo a compilé l’app mais reste bloqué sur la connexion pendant le transfert : interrompre
ce transfert, puis réutiliser **la même app compilée**, sans reconstruire :

```sh
rtk proxy xcrun devicectl device install app --device <iphone> <app-compilee.app>
```

Au démarrage du development build, ouvrir d’abord son projet Metro avec un lien du type
`exp+grrind-app://expo-development-client/?url=<URL-Metro-encodee>&disableFab=1`.
Employer l’IP LAN actuelle du Mac pour l’iPhone, pas `localhost`. Vérifier que l’app est
connectée à Metro avant d’envoyer le lien de l’atelier ; le succès de `process launch` seul
ne prouve pas que le bundle ou l’écran a démarré. Puis, sur le processus ouvert :

```sh
rtk proxy xcrun devicectl device process launch --device <iphone> \
  --payload-url 'grrindapp-dev://character-showcase?item=moumoutivation' app.grrind.dev
```

Remplacer le paramètre par l’item reconnu par l’atelier. La Moumoutivation est accessible depuis
**GRRIND dev → Réglages → Atelier avatar 3D → Tester la Moumoutivation**. Vérifier le lancement
et la connexion Metro. En cas de relance avec `--terminate-existing`, recommencer par le
lien du projet Metro, sans effacer la session ni les données de l’app. Le bouton de Réglages
est le parcours ordinaire pour retrouver l’atelier une fois le projet ouvert.

Pour une nouvelle donnée Unity, confirmer que l’app hôte embarque le framework compilé
(UUID et fichiers Data) avant d’annoncer l’essai disponible. Pour une modification JS seule,
vérifier le nouveau parcours via Metro ; aucune comparaison de binaire ou reconstruction.
Le message de livraison donne le chemin exact, le périmètre atelier/catalogue et ce que
l’auteur doit observer sur son téléphone.
