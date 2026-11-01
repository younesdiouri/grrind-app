# ʿĀlam al-Nafs et atelier

**V1 visuelle Unity livrée dans #267 :**
[Al Kasal et l’arène d’hiver](design/al-kasal-unity.md). La guilde, le paresseux
facetté et ses petits canapés utilisent une seule scène 3D paysage, sans barre de PV.
Les participants viennent frapper au corps à corps depuis les efforts du journal serveur.
Le récit, les commandes et le bilan restent accessibles dans React Native.

**Règles hebdomadaires (#333) :** le contrat de
[grrind-back#333](https://github.com/younesdiouri/grrind-back/pull/333) est livré en production.
L’inscription est personnelle et persistante dans la guilde. Seuls les inscrits contribuent
et peuvent recevoir du butin selon leur effort. Le chef choisit avant dimanche 19 h Paris
une difficulté parmi les trois options serveur ; chaque semaine commence en facile.
Un seul combat se résout automatiquement à 19 h, avec le butin du choix. Les inscriptions
modifiées après clôture concernent les éditions suivantes, sans modifier le replay.

Les cartes distinguent les cibles (`thresholdPermille`) et la probabilité de victoire
(`probabilityMillionths`, dont 1 000 000 vaut 100 %). Ni probabilité, ni gains, ni règles
de combat ne sont calculés sur le mobile. Les éditions historiques gardent leurs rencontres
et leur difficulté nulle ; les événements et timestamps serveur conduisent toujours le replay.

Les cinq caractéristiques sont hebdomadaires : remise à zéro dimanche à 20 h Europe/Paris,
en PvE et PvP. XP, niveau, compétences, titres et possessions restent acquis. Les taux de
combat viennent uniquement des équipements portés. Un import historique peut créditer de
l’XP sans augmenter les caractéristiques courantes. Au retour au premier plan et à la
frontière hebdomadaire (changements d’heure inclus), le mobile relit les valeurs serveur.
Le profil public reste compact, sans ajout de statistiques conformément au #328.

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

Le contrat est généré dans grrind-back puis consommé depuis `main` sans modification manuelle :

```sh
npm run api:pull
npm run api:generate
npm run api:check
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

Le flux invisible inscription/choix/reprise au premier plan dispose de
`.maestro/alam-preferences.yaml` : `npm run e2e:ios:flow -- .maestro/alam-preferences.yaml`.
Il crée une guilde avec l’unique compte jetable du harness et utilise les vrais PUT.
Il se joue pendant la collecte, avant dimanche 19 h Paris. Les refus 403/409/404/422,
la clé stable après coupure/redémarrage et les replays à une/trois rencontres ont des tests
ciblés sur le vrai client HTTP et les fonctions de présentation.

### Essai iPhone avant fusion du #333

Branche `feat/333-weekly-alam`, development build déjà installé, même réseau que le Mac :

```sh
EXPO_PUBLIC_API_URL=https://grrind-back.fly.dev npm start -- --lan
```

Ouvrir **GRRIND dev** et choisir le Metro du Mac (8081). Aucun rebuild natif ni publication
n’est nécessaire. Si Metro tourne déjà, conserver son terminal et définir l’URL dans
`.env.local`, puis recharger le bundle. Utiliser son propre compte et sa propre guilde
pour cet essai.

1. Accueil et Inventaire → Statistiques : valeurs de la semaine, échéance 20 h Paris,
   XP/niveau permanents ; équiper/retirer un objet change les taux serveur, pas les
   caractéristiques de base.
2. Combat : s’inscrire, quitter/revenir ou rouvrir l’app, puis se désinscrire/réinscrire.
   Vérifier le texte de persistance et que seuls les inscrits contribuent.
3. Avec le chef : comparer les trois probabilités et leurs jauges, choisir Intermédiaire
   puis Difficile et rouvrir l’écran. Avec un membre : les prévisions restent lisibles et
   aucun bouton de choix n’apparaît.
4. Après dimanche 19 h : vérifier l’unique combat et son butin, rejouer sans gain nouveau,
   changer l’inscription sans modifier le résultat clôturé. Ouvrir aussi une ancienne
   édition à trois rencontres. Dimanche 20 h : les lectures courantes repartent de la
   réponse serveur, XP et possessions demeurent.

La PR front reste ouverte jusqu’au test iPhone et à l’accord explicite de l’auteur.
Ne pas fusionner, publier, lancer EAS ou soumettre à l’App Store avant cet accord.

### Vérifications du 1er novembre 2026

- Typecheck, lint et 645 tests unitaires : verts ; contrat tiré de `grrind-back/main`.
- Client HTTP front exécuté contre le backend local réel avec un compte jetable existant :
  login et état en 200, inscription, choix HARD, trois probabilités serveur, persistance par
  un nouveau GET, désinscription et aucune clé en attente après confirmation. Aucun reset,
  migration ni modification du dépôt backend.
- Le bundle du Metro iPhone existant (8081) confirme `https://grrind-back.fly.dev`.
- Flow Maestro `alam-preferences` **vert en 2 min 57 s** après le correctif de démarrage :
  inscription, probabilités, choix Intermédiaire puis Difficile, retour au premier plan,
  désinscription et réinscription. Le délai du long défilement de retour est adapté à 60 s.
  Development build existant réutilisé, aucun rebuild. Rapport : `artifacts/e2e/report.xml`.
- Essai iPhone validé par l’auteur : « j’ai checké c’est good ». Aucun changement Unity/natif.

Au premier essai iPhone, le démarrage restait sur le splash bleu. Le calcul de l’échéance
parcourait les heures sans limite en attendant une heure « 20 » : un moteur natif qui ignore
`hourCycle` et utilise un cadran de 12 heures ne pouvait jamais satisfaire cette condition.
Le calcul demande maintenant `hour12: false`, borne la recherche à une semaine avec la marge
du changement d’heure et, si le format reste inexploitable, planifie une relecture horaire.
Cela ne modifie aucune valeur de jeu.

Reproduction contrôlée : l’ancien calcul expire après 1,5 s dans un processus de test isolé ;
le scénario corrigé termine en environ 60 ms, lancement du processus compris. Deux tests
protègent l’horloge native et son repli, en plus des cas DST. Après la correction et une
relance du development build, l’accueil a été constaté sur l’iPhone physique via Device Hub.
Aucun rebuild, aucune remise à zéro ni déconnexion volontaire.

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
