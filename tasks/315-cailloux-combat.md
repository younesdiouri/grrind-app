# #315 — Cailloux animé et stable

Ticket : https://github.com/younesdiouri/grrind-app/issues/315

## Diagnostic et objectif

Reproduction dans Unity 6000.3.26f1, scène Arena : le prefab possède zéro moveset.
`FighterPose.LateUpdate` lève `IndexOutOfRangeException` ligne 55 avant d’appliquer
l’orientation. Il reste donc dans sa pose et son orientation de création.
Le serveur, les dégâts et le résultat ne changent pas.

## Plan

- [x] Reproduire l’exception sur le prefab réellement chargé par BattleBridge.
- [x] Faire échouer le contrôle de prefab sur le moveset manquant.
- [x] Mettre à jour CaillouxMob.Build : moveset FIST complet, clips Generic conservés,
  chute de KO posée au sol et maintenue jusqu’au verdict.
- [x] Contrôler les sept gestes, le KO et la victoire via le lecteur réel et le bridge,
  contacts des deux côtés, orientation et continuité de mouvement.
- [x] Export device uniquement, development build installé sur l’iPhone avec l’arène #316.
- [x] Validation auteur sur iPhone ; livraison autorisée le 28 octobre.

## Sources, commandes et critères

Builder et contrôles : `spikes/Unity3D/Assets/Editor/CaillouxMob.cs`, lecteur partagé
`Assets/Spike/FighterPose.cs`, configuration et approche `BattleBridge.cs`.
Conserver les conventions C# existantes, les poses indexées et le contact canonique 0,5.
Les assets sont écrits par Unity ; aucun YAML de prefab édité à la main.

Commandes : `rtk proxy /Users/younesdiouri/.unity/bin/unity recompile --project-path
/Users/younesdiouri/Desktop/grrind-app/spikes/Unity3D --json`, puis commandes officielles
`eval` pour `CaillouxMob.Validate()` et ses contrôles en Play mode. Export prévu :
`rtk proxy env UNITY_IOS_TARGETS=Device ./scripts/unity-ios.sh`.

Le contrôle doit échouer avant la correction, passer après ; aucun IndexOutOfRange,
mob tourné vers l’adversaire, mouvement réel mesuré sur mesh déformé, coup visible au
contact, KO qui reste au sol et sortie normale. Jugement artistique final sur l’iPhone.
Aucun backend, génération payante, nouveau rig humain, EAS ou build Simulator.

## Preuves éditeur

Contrôle rouge initial : `Cailloux: missing complete FIST moveset (guard through victory)`.
Après correction, `CaillouxMob.Build()` et `CaillouxChecks.Playback()` passent : 50 états,
sol entre −0,000006 et +0,000379 m après compression du clip, KO de 0,883 m de haut, écart poignet/surface de 0,207 m
pour le joueur et 0,096 m pour le mob (la main prolonge le poignet). Capture de contact inspectée.
La finale masque le vaincu et passe à la victoire du joueur.

`FighterPose.Bone` utilise désormais les sockets du rig Generic sérialisés par le builder :
torse à 0,783 m, mains et tête réelles pour les impacts et l’ombre. Auparavant le torse était
la racine au sol. Le contrôle exige ces sockets. Les compteurs réels avancent de 1 à 342
frames, temps 0 à 5,714 s ; la console effacée puis observée ne contient aucune erreur.

Animation de chute produite avec [SetEditorCurve Unity 6.3](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/AnimationUtility.SetEditorCurve.html),
appui au sol mesuré sur le [mesh déformé](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/SkinnedMeshRenderer.BakeMesh.html).
Le framework Device de #316 a été exporté/compilé (UUID `556DB339-1350-314F-8F76-0113ABFB4418`).
Le development build est installé via `devicectl`, sans nouvelle slice Simulator.
UUID du framework et 16 fichiers Data embarqués vérifiés contre l’export. L’app a été lancée sur l’iPhone après déverrouillage le 28 octobre, via Metro 8081.
La revue visuelle reste à l’auteur.

Le HUD utilise aussi les sockets réels du mob. Les étincelles sont calculées après la
pose du contact, avec un ancrage corporel proche du poing ; le contrôle exige leur présence
à moins de 15 cm d’un socket réel. Il détecte ainsi le décalage d’une frame observé lors
de la revue. Le cache de renderers est vidé quand les combattants changent.

## Validation et livraison — 28 octobre

L’auteur valide la version installée : « franchement mon gars vraiment bien joué c’est vraiment lourd. Tu peux push main merge déployer etc. que ça soit back ou front tu gères ».
L’interdiction de push est levée pour ce lot ; fusionner les trois tickets puis lancer
un build EAS production et sa soumission TestFlight. TypeScript/lint, 608 tests et
31 previews passent sur le code final. La vérification du candidat de production
reste distincte de cette validation du development build.
