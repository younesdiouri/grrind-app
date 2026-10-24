# ʿĀlam al-Nafs et atelier

**V1 visuelle Unity livrée dans #267 :**
[Al Kasal et l’arène d’hiver](design/al-kasal-unity.md). La guilde, le paresseux
facetté et ses petits canapés utilisent une seule scène 3D paysage, sans barre de PV.
Les participants viennent frapper au corps à corps depuis les efforts du journal serveur.
Le récit, les commandes et le bilan restent accessibles dans React Native.

**Refonte métier distincte prévue côté backend :**
[grrind-back#317](https://github.com/younesdiouri/grrind-back/issues/317).
Les nouvelles règles restent à cadrer avec l’auteur avant implémentation.

Le [cadrage visuel Unity et nouveau bestiaire](design/unity-pve-alam.md) distingue
la création des adversaires [#251](https://github.com/younesdiouri/grrind-app/issues/251)
et leur intégration dans l’app [#249](https://github.com/younesdiouri/grrind-app/issues/249).
Le raid a abandonné ses sprites, son décor 2D et le chargement des anciennes apparences.
Le reste du PvE garde son chantier distinct. Al Kasal utilise ImageGen → Meshy → Blender → Unity.

Le serveur décide des jauges, des rencontres, du récit et des récompenses. Le mobile ne lit que
les événements horodatés pour animer Al-Kasal et les participants. La lecture et le replay
restent des GET : quitter l’écran, reprendre ou rejouer ne distribue rien.

Le bouton de développement dépend exclusivement de `canLaunchManual`. Les intentions de
lancement et de fabrication conservent leur clé d’idempotence dans SecureStore après une
réponse incertaine, y compris après redémarrage. Une confirmation libère la clé. Les refus
métier de crafting libèrent aussi l’intention ; une erreur réseau ne le fait jamais. L’atelier
propose de vérifier une fabrication interrompue avant de permettre une nouvelle intention.

## Contrat et configuration

Le contrat est généré dans grrind-back#279 puis consommé sans modification manuelle :

```sh
GRRIND_API_REF=<branche-backend> npm run api:pull
npm run api:generate
GRRIND_API_REF=<branche-backend> npm run api:check
```

Pendant un développement parallèle avant push, `GRRIND_API_FILE=/chemin/openapi.yaml` peut
viser l’export officiel produit par `make openapi`. En CI utiliser la référence Git.
Aucune clé OpenAI n’entre dans l’application : elle appartient à la configuration serveur.
Le récit local est identifié comme récit de secours et conserve tous les résultats.

Seuls les effets de coups et de butin sont synthétisés localement (voir `assets/audio/alam/README.md`).
La musique d’ambiance a été retirée à la demande de l’auteur le 24 octobre 2026.
`expo-audio` nécessite un rebuild développement ; aucune permission microphone ou lecture en
arrière-plan n’est demandée. Le son peut être coupé et s’arrête à la fin ou en arrière-plan.
Les animations et l’haptique respectent le réglage de mouvement réduit. Les portraits utilisent
le composant de profil existant ; tant que le serveur ne fournit pas d’avatar, il affiche les
initiales. Les anciens combats restent accessibles depuis le bas de l’écran ʿĀlam.

## QA reproductible

Préparer le build Metro avec `npm run e2e:ios:dev`. La scène autonome, sans gain, est accessible
en développement via `grrindapp-dev://alam-demo` et `.maestro/alam-scene.yaml`.

Le parcours réel exige un compte de QA dans une guilde, des contributions et la capacité de
lancement manuel activée sur le serveur local. Le backend prépare ces données ; le mobile ne
réinitialise et ne migre pas sa base. Un fichier privé de la forme
`{"accounts":[{"email":"…","password":"…"}]}` fournit les identifiants :

```sh
ALAM_QA_CREDENTIALS=/chemin/prive.json node scripts/alam-qa-flow.mjs
E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/alam-inventory.yaml
```

`E2E_OFFLINE=1` empêche le harness de remplacer les comptes ; les requêtes restent réelles.
Le premier flow lance une nouvelle édition et fabrique réellement un objet : prévoir les
ressources nécessaires et ne pas utiliser un compte de production. Le second équipe les
gantelets fabriqués et inspecte les ressources restantes. Les captures sont sous
`artifacts/e2e/<horodatage>/`. Le smoke existant garde le parcours des combats solo.

Preuve historique du 14 septembre 2026, avant la scène Unity : trois participants, parcours guilde →
lancement → trois rencontres → récit/drops → replay → atelier réussi sur simulateur iOS.
L’observation API a confirmé une seule édition manuelle après replay, 14 essences puis 4 et un
gantelet après crafting. Le gant a ensuite été équipé depuis l’inventaire.
Les tests unitaires couvrent horloge/reprise, intentions concurrentes et persistées, refus et
ressources. L’écoute/haptique sur appareil physique, un appel OpenAI avec la future clé et une
coupure réseau pendant une vraie mutation restent des vérifications distinctes à effectuer.
