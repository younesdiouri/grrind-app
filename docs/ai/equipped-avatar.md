# Aperçu du personnage équipé — #243

L’inventaire, les profils et les réglages doivent montrer les objets réellement portés,
à partir des sept emplacements serveur. Une mutation réussie remplace déjà le cache complet
de l’inventaire : l’aperçu doit lire cette réponse, sans état d’équipement local.

Réutiliser les sept modèles du catalogue `grrind-back#313` : gants dorés, trois Guinzz,
deux t-shirts et Le Poids Lourd, plus une variante bleue pour l’ancien `HALTER_EGO`
présent dans le signalement. Les emplacements vides reviennent à la tenue Quaternius
de base, pieds et mains nus ; aucun équipement de démonstration implicite.
Les objets sans modèle conservent leur identité dans les cases et sont signalés comme
absents de l’aperçu, sans leur substituer un autre objet.

## Réalisation

1. Tester une correspondance pure entre clés serveur, emplacements et variante d’aperçu.
2. Capturer dans Unity les 72 combinaisons : 3 torses × 4 jambes × 2 mains × 3 armes.
   Utiliser le CLI/Pipeline officiel, le même modèle, la même pose et la même caméra.
   Conserver les captures PNG et leur provenance ; ne pas lancer Unity dans les petites
   vignettes iOS (Unity as a Library ne prend en charge que le rendu plein écran).
3. Brancher le composant partagé sur l’équipement fourni par chaque écran ; couvrir
   l’équipement, le remplacement, le retrait, la coexistence gants/arme et les anciens objets.

Code en `src/features/combat/`, appelants inventaire/profil/réglages ; captures sous
`assets/images/heroes/unity/`. TypeScript strict, types du contrat généré, pas de dépendance.
Exemple : `equippedAvatarPreview(inventory.equipment)` ; les noms traduits ne décident jamais
du modèle.

## Vérification et limites

Tests Node ciblés avant/après implémentation, puis `npm run typecheck`, `npm run lint`,
`npm test` et `npm run previews:check` une fois sur le code final.
Réutiliser `npm run e2e:ios:dev`, étendre le flow inventaire adapté et inspecter ses captures.
Mesurer le cadrage à 512 × 640 px et comparer les variantes à vide/équipées.

Ce ticket ne modifie ni le backend ni les données de comptes existants pour la QA.
Pas de publication EAS, de nouveaux meshes ou de génération payante. Les animations de
combat de l’haltère et la personnalisation persistante restent dans leurs tickets dédiés.
Les snapshots de combat ne sont pas remplacés par l’inventaire courant.

## Preuve du 23 octobre 2026

Typecheck et lint passent, ainsi que 571 tests et les 29 previews, sans rebuild natif.
Les 72 captures Unity sont distinctes, mesurent 512 × 640 px et pèsent ensemble 8,12 Mo.
Les pixels du personnage et de ses objets restent dans `[90, 76, 376, 600]`, soit environ
82 % de la hauteur pour le personnage, tête et pieds dans le cadre source. Les SHA-256 et
la méthode de mesure sont dans `assets/images/heroes/unity/PROVENANCE.json`.

Un seul compte QA jetable a reçu ses pièces et objets via les API normales. Les essais
`inventory-avatar.yaml` ont effectivement vérifié et capturé l’haltère bleu ajouté, retiré,
rééquipé, puis remplacé par le doré ; le t-shirt, le pantalon violet/cyan et les gants.
Ils se sont arrêtés sur des clics Maestro passant sous la barre d’onglets. Le pilote centre
désormais chaque cible interactive et confirme la case vide après un retrait.

La reprise ciblée `inventory-avatar-finish.yaml` passe en 1 min 24 s : retrait des gants en
conservant les vêtements et l’arme, réglages, profil public en lecture seule et conservation
après arrêt/relancement. Les captures ont été inspectées. La phase d’équipement déjà passée
n’a pas été rejouée une troisième fois. Le contrat et le backend restent inchangés.

![Inventaire : mains vides, t-shirt corail, Guinzz cyan et haltère doré](equipped-avatar/inventory.png)
![Même équipement dans les réglages](equipped-avatar/settings.png)

Sources : [Unity as a Library](https://docs.unity3d.com/6000.3/Documentation/Manual/UnityasaLibrary.html),
[Expo Image SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/image/).
