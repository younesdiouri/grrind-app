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
- [ ] Export device uniquement, réinstallation du development build après l’arène #316.
- [ ] Validation sur iPhone par l’auteur avant push.

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
sol entre −0,000062 et +0,000259 m, KO de 0,883 m de haut, écart poignet/surface de 0,207 m
pour le joueur et 0,096 m pour le mob (la main prolonge le poignet). Capture de contact inspectée.
La finale masque le vaincu et passe à la victoire du joueur.

`FighterPose.Bone` utilise désormais les sockets du rig Generic sérialisés par le builder :
torse à 0,783 m, mains et tête réelles pour les impacts et l’ombre. Auparavant le torse était
la racine au sol. Le contrôle exige ces sockets. Les compteurs réels avancent de 1 à 342
frames, temps 0 à 5,714 s ; la console effacée puis observée ne contient aucune erreur.

Animation de chute produite avec [SetEditorCurve Unity 6.3](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/AnimationUtility.SetEditorCurve.html),
appui au sol mesuré sur le [mesh déformé](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/SkinnedMeshRenderer.BakeMesh.html).
Le framework installé sur l’iPhone sera remplacé une fois les changements #316 terminés.
