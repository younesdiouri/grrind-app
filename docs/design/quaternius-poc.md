# POC Quaternius — un personnage, deux coiffures, un item

Ticket : [#229](https://github.com/younesdiouri/grrind-app/issues/229). Décision de l'auteur du
21 octobre 2026 : nouvelle piste Sport Fantasy Cartoon, sur des personnages pré-riggés.
Le POC est isolé ; le pilote du combat et le contrat serveur ne changent pas.

## Essayer

Dans le development build avec le framework Unity de cette branche, ouvrir
`grrindapp-dev://character-showcase`, ou **POC Quaternius** dans l'atelier `/avatar-3d`.
L'atelier propose deux coiffures, bottes/pieds nus, repos/crochet, lecture/pause, face,
profil, trois-quarts et visage. **Voir le duel PvP** joue un duel de démonstration avec deux
instances masculines Quaternius, coiffures opposées, dans l'arène et le HUD existants.
Les réglages restent locaux à cet écran ; aucun gain réel ni défi réseau n'est créé.

La validation artistique appartient à l'auteur. Les captures sont des propositions à
examiner, pas une approbation. Aucun système complet d'itemisation ni remplacement du
personnage du combat ne doit partir avant son verdict personnel.

## Audit et choix

- PR #228 : brief de commande à un artiste, documentation seulement. Elle n'apporte pas
  de personnage à intégrer. Les anciens modèles et scènes sont conservés.
- Le projet `spikes/Unity3D` possède déjà URP, l'arène, le bridge natif Expo, le sampler
  `MuscuPose`, le pack UAL2 Humanoid et les bases Quaternius. Ils sont réutilisés.
- `claude mcp list` reconnaît Unity et Meshy. Codex pilote le même serveur Unity Pipeline
  par le CLI officiel (`unity command`), dont les outils de capture. Blender MCP fonctionne
  après ouverture de Blender 4.5.14 LTS. Son protocole 13 est ancien mais les appels utilisés
  fonctionnent ; aucune mise à jour ni génération payante n'a été nécessaire.
- Les deux ZIP **Standard** locaux sont CC0, licence vérifiée dans chaque archive.
  La version Standard Base contient ici les corps Superhero et huit fichiers de coiffure
  (dont sourcils et barbe), avec FBX Unity et glTF. Les `.blend` et shaders configurables
  des versions Source ne sont pas présents. Aucune option de peau/yeux fictive n'est exposée.
- La Fantasy Standard contient Peasant et Ranger, versions masculines/féminines, en FBX
  et glTF, tenues complètes et pièces. Son README exige de remplacer le corps sous la tenue.
  Le Humanoid commun ne suffit pas à prouver une compatibilité avec toutes les morphologies.
- Un Peasant masculin est assemblé avec la tête Superhero et ses yeux/sourcils d'origine.
  Les os sont réaffectés par nom au squelette original, doigts conservés. Les mains utilisent
  la texture Regular du pack Fantasy. C'est une tenue d'essai Fantasy, pas une tenue de sport
  finale ni une panoplie GRRIND terminée.
- L'unique item est la paire de bottes Peasant, un mesh **skinné**, substitué aux pieds nus.
  Ce choix valide un vêtement déformable réel avant de fabriquer des sneakers. Pas de Meshy,
  Mixamo ou nouvel abonnement nécessaire pour cette preuve.

Sources officielles : [Base](https://quaternius.com/packs/universalbasecharacters.html),
[Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html),
[UAL2](https://quaternius.com/packs/universalanimationlibrary2.html).
Provenance, SHA-256 des archives et licences dans
`Assets/Characters/QuaterniusPOC/PROVENANCE.json`. Les packs complets restent ignorés dans
`artifacts/quaternius-source/`. Seuls les fichiers utilisés sont versionnés.

## Reproduction

1. Extraire les deux ZIP sous `artifacts/quaternius-source/`, en conservant leurs dossiers.
2. Dans Blender, exécuter `spikes/art-source/prepare_quaternius_head.py`. Le script lit le
   FBX Unity, coupe le cou à 1,56 m et prolonge sa bordure jusqu'à 1,32 m sous le col.
   Le haut garde ses poids ; le bas suit `spine_03`. L'export utilise `FBX_SCALE_ALL` :
   le mélange glTF → FBX avec l'échelle par défaut avait produit un skin réduit par 100
   une fois réaffecté au squelette Unity. Ce n'est pas compensé avec un scale arbitraire.
3. Dans Unity, exécuter `QuaterniusPoc.Build()` par `unity command eval`. Ce code assemble
   les vrais meshes, crée les matériaux, le prefab `Resources/QuaterniusShowcase.prefab`
   et la scène isolée `Assets/Spike/QuaterniusPOC/CharacterShowcase.unity`, puis valide.
4. Les coiffures et vêtements gardent les bindposes de leur FBX compatible, les os sont
   réaffectés par nom au squelette masculin. Le cou modifié est exporté avec le même rig.
   Le corps caché est retiré ; la section des pieds nus ne s'affiche que sans bottes.
5. En Play, capturer avec `unity command capture_game_view --source camera --width 440
   --height 580 --save_path Captures/<nom>.png`. Inspecter les fichiers réels, puis déplacer
   les preuves utiles hors d'`Assets` pour éviter leur inclusion dans le build.
6. Pour le Simulator uniquement : fermer l'éditeur, exporter avec
   `unity build spikes/Unity3D --target iOS --execute-method MobileBuild.Simulator --timeout 900`,
   compiler le scheme `UnityFramework` du projet généré avec le SDK `iphonesimulator` et le
   DerivedData existant. Mettre à jour la tranche `ios-arm64-simulator` du XCFramework local.
   La tranche iPhone n'est pas reconstruite par cette vérification.
7. `E2E_FORCE_BUILD=1 npm run e2e:ios:dev` installe le development build affecté, puis
   `E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/avatar-3d.yaml`. Le flow existant vérifie
   l'atelier historique et le combat, puis joue `quaternius-poc.yaml` : cheveux, bottes,
   cadrages, animation et retour d'arrière-plan. Aucun compte serveur créé.

`model: 'quaternius'` sélectionne explicitement ce prefab dans `BattleBridge` ; seuls
l'atelier et son aperçu PvP l'envoient. Sans ce sélecteur, le chemin historique reste utilisé.
Le prefab possède un éclairage clair activé uniquement en inspection : le duel garde la
lumière de l'arène, sans deux éclairages supplémentaires liés aux combattants.
Le sampler POC respecte la phase même au repos, pour que **Figer** produise une pose stable.

## Autocritique et limites

Les premières découpes par suppression de triangles ont laissé un cou dentelé, puis de la
peau traversant la tunique. Après ces deux essais, la méthode a été abandonnée au profit
de la coupe et de l'extrusion Blender. Le gros plan du cou fait partie des preuves à lire.

La base mesure environ 1,82 m en pose de référence, avec une tête anatomique de l'ordre de
0,25 m (environ sept têtes). Les proportions du corps Fantasy remplacent celles du torse
Superhero ; cette combinaison unique est vérifiée, aucune compatibilité universelle n'est
annoncée. Les pièces gardent les unités métriques et leur placement d'origine.

L'inspecteur propose le repos et le crochet `Melee_Hook` du pack UAL2 déjà présent. Le duel
utilise aussi `Idle_Shield_Break` pour le coup reçu, `Sword_Block` pour l'esquive,
`Sword_Regular_B` pour le combo et `Melee_Hook_Rec` pour la relance. Le critique réutilise
le crochet ; aucune nouvelle animation n'est revendiquée. Pas de course/victoire inventée.
Le contact .5 du sampler est placé à .74 du clip du crochet. Les mains sont articulées
mais la fermeture du poing reste stylisée. Les accents néon et la tenue sportive finale
restent à concevoir après validation de la base ; ne pas les confondre avec cette preuve.

Le support féminin, d'autres morphologies, la persistance, les slots serveur, les sneakers,
les accessoires de main, les mesures de performances sur iPhone et Android sont hors de ce
POC. La dernière tranche iPhone locale conserve le pilote historique tant qu'elle n'est pas
explicitement reconstruite. Ce livrable ne constitue pas un candidat de production.

## Preuves du 21 octobre 2026

- Recompilation C# sans erreur ; `QuaterniusPoc.Validate()` passe : Humanoid valide, os des
  doigts, deux coiffures, bottes/pieds nus, os et matériaux de tous les renderers résolus.
- Blender : 12 894 triangles pour les quatre pièces Peasant ; aucun sommet sans poids.
- Export Unity Simulator et compilation `UnityFramework` : codes de sortie 0.
- Development build Simulator : réussi, zéro erreur. Pas de build iPhone, EAS ou Release
  complet de l'application. Le framework Unity lui-même utilise sa configuration existante.
- Typecheck, lint, 560 tests unitaires et 29 previews passent. Les routes ont été régénérées
  par Metro ; la première lecture TypeScript précédant cette génération refusait le nouveau
  chemin `/character-showcase`. Aucun cast n'a été ajouté pour masquer cet échec.
- Flow `.maestro/avatar-3d.yaml` incluant `quaternius-poc.yaml` : **PASS**, 2 min 51 s,
  une exécution. Rapport `artifacts/e2e/report.xml`, session `2026-10-21_182714`.
- 18 captures du parcours, examinées ; huit preuves natives choisies dans
  `references/quaternius-poc/app/`, six rendus éditeur dans `references/quaternius-poc/unity/`.
  Les captures natives font 1206 × 2622 pixels, soit 402 × 874 points à l'échelle 3.
- Changement de coiffure, retrait/remise des bottes, poses, profil, gros plan du cou et
  reprise après arrière-plan examinés dans la vraie app. Le combat historique garde son
  pilote précédent et le flow parcourt son retour à l'atelier.
- Les captures successives du personnage animé ont des pixels différents dans sa zone de
  rendu ; une vidéo locale `artifacts/unity-spike/quaternius-simulator-demo.mp4` complète
  les captures figées. Elle n'est pas ajoutée aux sources.

La première itération avait la tête penchée ; le crochet a une phase aérienne avec genou
levé. Le poing ne correspond pas encore à une chorégraphie sportive finale.

## Retour de l'auteur et aperçu PvP

Après son essai personnel du 21 octobre, l'auteur écrit : « ok pas mal pour une premiere
base » puis demande de corriger le regard vers le bas et de voir un combat entre deux
personnages sur la scène PvP. Cette demande autorise ce nouvel aperçu, sans ouvrir
l'itemisation complète ni remplacer par défaut le pilote du jeu.

Le problème vient des courbes de tête/cou d'`Idle_No_Loop` : à mi-parcours, l'axe de regard
est incliné de **−30,97°**. Une variante locale `Forward idle.anim` conserve le mouvement du
corps et règle les courbes de tête/cou : neck nod .35, head nod .1, rotations et inclinaisons
latérales à zéro. Le FBX tiers reste intact. Aucun repositionnement de tête à chaque frame.

`QuaterniusPoc.ValidateGaze()` s'exécute en **Play mode**, sur le véritable sampler : l'ancien
clip échoue au seuil de 12° ; le nouveau donne **2,07° / 0,66° / 2,18° / 0,59° / 1,69°**
aux phases 0 / .25 / .5 / .75 / .99. Le test ne se contente pas de lire la pose de référence
dans l'éditeur, où le graphe Humanoid n'avait pas évalué le clip.

Le duel reprend `fixtures/battle/duel-equipped.json`, une réponse PvP déjà capturée.
`BattleView.unityEnemy` permet au seul aperçu de fournir le deuxième avatar, comme il
fournit déjà `unityPlayer`. Les coups, PV, effets et résultats gardent la chronologie
existante. Le bridge ajoute une avancée/retour au modèle Quaternius autour de la phase de
contact .5 : l'écart initial d'environ un mètre entre poing et torse devenait visuellement
un coup dans le vide. `ValidateDuel()` vérifie les deux sens ; l'écart horizontal mesuré est
de **15,8 cm / 1,6 cm**, sous le seuil de 30 cm. Cela vérifie la lecture dans le plan caméra,
pas une collision physique de boxe. Le déplacement historique des autres modèles reste utilisé.

La PR reste en brouillon pour examiner le nouveau duel. Le Simulator et Metro sont laissés
actifs pour l'essai personnel demandé par l'auteur.

Validation de cette correction : export Unity, framework Simulator et development build
réussis ; typecheck, lint, 560 tests et 29 previews passent sur le code final. Le flow ciblé
`.maestro/quaternius-poc.yaml` passe en **1 min 39 s**, session `2026-10-21_194135`.
La première exécution avait échoué sur la visibilité de Malik : le pilote conservait ses
coordonnées portrait après le passage de l'app en paysage. La synchronisation explicite
du pilote en paysage a corrigé le test, sans changement de l'app. Le retour portrait est
observé avant de réorienter le pilote.

Les captures natives du regard corrigé, des deux combattants et du retour sont examinées
et conservées dans `references/quaternius-poc/pvp-app/`. La capture du duel est une phase
de déplacement, pas une preuve de contact ; `unity/pvp-contact.png` montre la phase de
contact contrôlée. Les poses restent très aériennes : ce premier aperçu permet de juger
le modèle dans le HUD existant, pas de valider une chorégraphie finale.
