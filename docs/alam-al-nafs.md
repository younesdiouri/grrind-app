# ʿĀlam al-Nafs et atelier

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

L’ambiance et les effets sont synthétisés localement (voir `assets/audio/alam/README.md`).
`expo-audio` nécessite un rebuild développement ; aucune permission microphone ou lecture en
arrière-plan n’est demandée. Le son peut être coupé et s’arrête à la fin ou en arrière-plan.
Les animations et l’haptique respectent le réglage de mouvement réduit. Les portraits utilisent
le composant de profil existant ; tant que le serveur ne fournit pas d’avatar, il affiche les
initiales. Les anciens combats restent accessibles depuis le bas de l’écran ʿĀlam.

## QA reproductible

Préparer le build Metro avec `npm run e2e:ios:dev`. La scène autonome, sans gain, est accessible
en développement via `grrindapp-e2e://alam-demo` et `.maestro/alam-scene.yaml`.

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

Validation locale du 14 septembre 2026 : scène avec trois participants, parcours guilde →
lancement → trois rencontres → récit/drops → replay → atelier réussi sur simulateur iOS.
L’observation API a confirmé une seule édition manuelle après replay, 14 essences puis 4 et un
gantelet après crafting. Le gant a ensuite été équipé depuis l’inventaire.
Les tests unitaires couvrent horloge/reprise, intentions concurrentes et persistées, refus et
ressources. L’écoute/haptique sur appareil physique, un appel OpenAI avec la future clé et une
coupure réseau pendant une vraie mutation restent des vérifications distinctes à effectuer.
