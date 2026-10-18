# Spike Unity 3D et génération IA

Ticket : https://github.com/younesdiouri/grrind-app/issues/213.

## Extension autorisée : intégration dans le combat de l’app

Le 18 octobre, l’auteur demande de poursuivre jusqu’à un premier personnage proche de la
maquette approuvée, équipé et animé dans le combat du front. Un banc dans l’Editor ne suffit
plus à terminer le spike : l’auteur doit pouvoir le tester dans l’application sur iPhone.
Les adaptations natives de développement nécessaires à cette intégration sont incluses.
Pas de publication EAS/TestFlight ni de changement des règles de combat serveur.

Première tranche : Muscu, tenue neutre et pieds nus, Haltère ego et Course-poursuite ;
sept gestes lisibles reliés à la chronologie existante. Contrôler le corps entier et les
gros plans tête/main, dans les deux orientations, avec et sans objets. Distinguer un geste
fonctionnel d’une animation finalisée et documenter les limites observées.

L’intégration évaluée est Unity as a Library : une seule scène plein écran de combat,
avec le HUD React Native conservé au-dessus. Unity documente uniquement le rendu plein
écran sur iOS/Android ; ne pas multiplier des vues Unity par personnage. Tester le cycle
ouvrir/quitter/rejouer, la mise en arrière-plan et la synchronisation avec l’horloge du front.
Les binaires Unity exportés sont des produits de build reproductibles, pas des sources Git.

### Personnalisation et reprise visuelle

L’auteur retient ensuite deux corps, homme/femme, de taille fixe et une couleur de peau
personnalisable. Les quatre sports ne doivent plus imposer quatre identités séparées.
Le premier rendu fabriqué par l’agent (shader en bandes, vêtement triangulé et poses
procédurales) est explicitement rejeté : trop éloigné des maquettes. Ne pas le reprendre
comme référence positive et ne pas présenter ce candidat comme une DA approuvée.

La reprise utilise les corps, textures et coiffures riggées **Universal Base Characters**
de Quaternius et les clips **Universal Animation Library 2**, licences CC0 présentes dans
les dossiers importés. La tenue et les deux objets sont séparés du corps. Les sources et
SHA des archives sont conservés ; aucune génération Unity AI n’est impliquée.
Le transfert d’animations est vérifié sur une scène isolée avec le mannequin du pack et
le corps cible. Un premier import configuré avec des métadonnées recopiées et un nœud
de mouvement modifié donnait des déformations sur les deux rigs ; il est supprimé.
L’import propre Humanoid de `UAL2Clean.fbx`, avec Bake Axis Conversion et les clips
automatiques, fonctionne. Ne pas réintroduire les métadonnées du fichier rejeté.

Les skills officiels Unity CLI/Pipeline du dépôt Unity-Technologies/skills sont consultés.
PixelLab MCP est également étudié : la documentation actuelle décrit des sprites et
animations 2D, pas un modèle 3D riggé. Aucun outil PixelLab n’est connecté à cette session.
Cette étude ne constitue ni un test de génération PixelLab ni un changement du choix 3D.

État intermédiaire : les deux corps sont visibles dans `Assets/Spike/Arena.unity`, sans
erreur de compilation/console sur cette exécution. La revue exhaustive des gestes, le
verdict artistique et la validation iPhone restent à faire. Le pont natif et son export
ne sont pas encore validés dans l’application.

### Intégration locale en cours

- `modules/grrind-unity` embarque un seul runtime, réutilisé entre atelier et combat.
  L’atelier de développement `/avatar-3d` propose corps, peau, deux objets, sept gestes,
  trois cadrages et un combat de démonstration dans `BattleView`.
- Les frames viennent de l’horloge Reanimated du combat ; Unity échantillonne les clips.
  Chaque geste possède un temps de contact mesuré dans le clip source. Les premiers clips
  `Hit_Knockback` et `Slide_Start` sont rejetés après capture : chute/glissade excessives.
- Les objets suivent tête/main, avec fermeture des doigts de la main porteuse quand l’arme
  est équipée. Le vêtement est skinné ; ses bords et les proportions restent un point de DA
  à améliorer. Ces rendus ne sont pas approuvés artistiquement.
- La capture avec SRP Batcher donnait des matériaux blancs hors peau ; désactiver le batcher
  dans le pipeline mobile rétablit la palette sur cette exécution. Mesurer les performances
  dans l’app avant de conclure sur le coût ou sur la cause exacte de ce défaut.
- `AgentScripts/ReviewAvatars.cs` capture corps/visage/prise pour les deux corps et sept gestes.
  Attendre des frames de jeu réelles évite des captures mélangeant des acteurs à destruction différée.
- `scripts/unity-ios.sh` exporte puis compile les frameworks arm64 simulateur et iPhone.
  Les produits sont ignorés par Git. L’export recrée le projet Xcode généré ; l’append avait
  conservé une référence Burst disparue. DerivedData est conservé.
- L’export simulateur est arm64 : le pod exclut x86_64 pour ce module et le target utilisateur
  lorsqu’un framework local est présent. Aucun support du simulateur Intel n’est revendiqué.

Reproduction : `./scripts/unity-ios.sh`, puis développement iOS habituel. Une modification
du C# ou des assets embarqués demande de réexporter Unity et de reconstruire le binaire de
développement ; une modification JS seule reste sur Metro. Le flow autonome prévu est
`E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/avatar-3d.yaml`.

Limites à ce stade : le flow n’est pas encore validé ; aucun test iPhone/Android ; aucune
persistance serveur des choix corps/peau. Les objets de combat proviennent du snapshot existant,
et l’atelier transmet ses choix uniquement au combat de démonstration. Le backend n’a pas été
modifié par cette tranche. Ne pas présenter cette intégration comme une livraison terminée.

## Objectif approuvé

Le 18 octobre 2026, l’auteur autorise un prototype Unity 3D avec les outils IA officiels.
Les personnages, objets et le pixel art précédents peuvent être remplacés. L’app sportive
et le plaisir de s’équiper restent l’intention ; aucune migration de production n’est autorisée
par ce spike. Le verdict doit reposer sur des captures réelles et des mesures disponibles.

## Correction de méthode : développer sans l’Assistant Unity

La génération d’assets par Unity AI est une option du spike, pas un préalable à son développement.
Le blocage de crédits décrit ci-dessous concerne uniquement ce service. L’agent peut écrire le C#,
construire les scènes, fabriquer des équipements simples, piloter les rigs et vérifier les rendus
avec la CLI et Pipeline déjà opérationnelles. Les skills sont des instructions techniques, pas
un service de génération. L’assimilation précédente « pas de crédits = spike bloqué » était erronée.

La reprise utilise le mannequin riggé déjà installé et une haltère construite par code. Il reste
un support technique, sans validation de DA. Une base de personnage adaptée et des animations
soignées restent nécessaires pour un résultat final : le moteur ne les fournit pas par défaut.

Références : [CLI indépendante de Unity AI](https://docs.unity.com/en-us/unity-cli/replace-mcp-server-unity-cli),
[exemple Codex présenté par Unity](https://unity.com/blog/unity-plugin-codex),
[exemples C# d’animation et IK](https://github.com/Unity-Technologies/animation-jobs-samples).
Les exemples historiques ne sont pas importés automatiquement dans le projet 6.3.

### Premier banc C# exécutable

- `Assets/Spike/CombatBench.unity`, construit avec `AgentScripts/BuildCombatBench.cs`.
- `Assets/Spike/CombatBench.cs` pilote les muscles humanoïdes, la caméra et des commandes de
  contrôle : garde, extension du bras, recul du buste, flexion, phase, rotation de caméra,
  vues entier/tête/main et affichage de l’haltère. Ce sont des poses de test, pas des clips
  de combat validés ni une attaque avec fente.
- Haltère fabriquée en cinq volumes, deux matériaux, sans collision physique. Un seul repère
  local sur RightHand, calibré pour ce mannequin ; aucun repositionnement propre à une pose.
  Le mannequin vient du FBX déjà installé avec le package Unity, sans appel à ses services IA.
- Itération visuelle : fermeture des doigts, centrage du manche, dégagement du visage et de
  la main opposée, correction du sens des articulations et de la hauteur du bassin en flexion.
  La correction de hauteur n’est pas un solveur de contacts au sol : déplacement des pieds,
  pouce et prise exacte doivent encore être travaillés pour des animations finales.
- Vérification finale : compilation sans erreur, quatre poses capturées en Play après avance
  des frames, gros plan de main inspecté. Mouvement réel de la main vérifié en lecture automatique
  par attente de changement de sa position (condition satisfaite en 112 ms, deux frames observées).
  Console Unity courante sans erreur/avertissement.
  Captures : `artifacts/unity-spike/bench-reviewed-0.png` à `bench-reviewed-3.png`,
  `bench-reviewed-hand.png`. Valeur d’exécution en arrière-plan rétablie, Play arrêté.
- Aucune performance iPhone/Android, seconde morphologie, chaussure ou DA finale validée.
  La suite du prototype n’attend plus les crédits des générateurs Unity.

## Cible visuelle pour la prochaine passe

Référence relue : `docs/design/references/retro-avatars-approved.png`, planche D validée.
La migration 3D est autorisée ; cette référence guide les proportions, couleurs, silhouettes
et le plaisir du loot. Elle ne valide pas les erreurs de raccords des anciens packs.

Premier sujet : **Muscu**, base pieds nus, débardeur gris, short anthracite, cheveux courts,
peau chaude. Puis **Haltère ego** (masses bleu acier, prise et accents dorés) et **Course-poursuite**
(monture ivoire, verres ambrés, petites ailes dorées). Aucun accessoire peint dans le corps.
Ne pas multiplier les avatars avant d’obtenir un premier personnage équipé convaincant.

| Travail | Cible | Preuve attendue |
| --- | --- | --- |
| Modèle | Proportions compactes proches des cinq têtes de la planche, épaules et mains lisibles, visage sobre ; vraie tenue neutre | Même cadrage que la référence, base seule puis équipée |
| Matières | Aplats chauds, quelques niveaux d’ombre, peu de plis, surfaces mates ; supprimer l’effet mannequin bleu brillant | Rendu dans Unity sur fond GRRIND, et détail de peau/tissu/métal |
| Caméra | Vue de trois quarts peu déformée, cadrage stable | Comparaison à 128 px et en grand |
| Objets | Volumes autonomes, silhouette et contrastes visibles ; une prise calibrée, doigts ajustés | Vue entière et détails dans les deux orientations et aux transitions |
| Mouvement | Animations adaptées à la masse du personnage et à l’objet ; contrôler les membres par des cibles quand nécessaire | Main, pieds, visage et contacts examinés en mouvement |

Le rendu rétro doit résulter d’abord des formes, de la palette et des ombres. Une réduction
de résolution peut être essayée ensuite ; elle ne remplace pas un modèle ou une animation soignés.
Garder les textes et cadres de l’interface nets. Ce premier essai ne demande aucune refonte Expo.

Documentation technique vérifiée pour préparer cette passe :
- [Caméra orthographique, Unity 6.3](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Camera-orthographic.html).
- [Shader Graph 17.3, seuil Step](https://docs.unity3d.com/Packages/com.unity.shadergraph@17.3/manual/Step-Node.html),
  brique pour construire des ombres en niveaux plutôt qu’un dégradé réaliste.
- [Animation Rigging 1.4, Two Bone IK](https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/manual/constraints/TwoBoneIKConstraint.html)
  pour diriger les membres vers des cibles ; la pose des doigts et l’ajustement des chaussures
  restent des travaux distincts, non résolus automatiquement par cette contrainte.

Faisabilité : les mécanismes de rendu et de rig sont disponibles. La qualité comparable à
la maquette reste à démontrer sur un vrai modèle adapté ; le mannequin technique actuel et
les images générées d’un personnage équipé ne constituent pas cette preuve.

## Essai minimal

1. Un humanoïde sportif sans équipement intégré, riggé et animé ; une seconde morphologie
   pour tester la réutilisation. Un mannequin technique ne valide pas la qualité artistique.
2. Trois équipements indépendants : lunettes, arme simple à une prise, chaussures fermées.
   Utiliser la génération Unity si le compte y donne accès. Garder prompt, modèle, origine,
   résultat brut, retouches et temps de préparation. Aucun achat automatique.
3. Garde, attaque avec fente, recul après impact, esquive ; transitions visibles, puis arrêt
   sur image. Caméra de combat dans les deux sens et vue de contrôle autour du personnage.
4. Comparaison sans équipement, chaque objet seul, puis tenue cumulée. Pas de réutilisation
   des anciens PNG comme géométrie finale. Pas de masque de peau ajouté pour cacher un raccord.

## Raccords à vérifier

| Zone | Critère concret | Cas difficiles |
| --- | --- | --- |
| Lunettes | Verres devant les yeux, pont sur le nez, branches raccordées aux tempes ; géométrie arrière masquée par la tête | Tête tournée, recul, différentes largeurs de visage, vue de dos |
| Arme | Prise et doigts cohérents, absence de glissement ou traversée du poing/avant-bras | Fente, recul, transition rapide ; ne pas déplacer l’arme arbitrairement par pose |
| Chaussures | Pied et cheville enveloppés, semelle cohérente au sol, absence de peau ou chaussure double | Flexion, pas, pointe/talon, chevauchement des jambes |
| Corps | Même identité et mêmes proportions pendant tous les mouvements | Épaules, coudes, genoux ; déformations et contacts au sol |

Deux passes : vue entière et gros plans pendant la première ; relecture des exports finaux
et de l’animation après corrections pendant la seconde. Les coordonnées et tests de code
ne prouvent pas la qualité d’un contact. Examiner aussi les instants intermédiaires.

## Outils et séparation du projet

- CLI installée : Unity CLI 1.0.0-beta.13, arm64, par l’installeur officiel Unity.
- Éditeur retenu pour le premier essai : 6000.3.26f1, branche 6.3 LTS.
- Projet expérimental prévu : `spikes/Unity3D/` ; isoler Library, Temp, caches et builds du Git.
- Pipeline officielle avant le premier lancement pour piloter scènes, compilation et captures.
- Template Universal 3D (`com.unity.template.urp-blank`), sans réécrire le front Expo.
- Ne pas activer de licence, accepter de nouvelles conditions ou acheter de crédits à la place
  de l’auteur si cette action requiert son intervention.

Commandes de préparation vérifiées dans l’aide de la CLI installée :

```sh
rtk proxy unity auth status --json
rtk proxy unity auth login
rtk proxy unity license --json
rtk proxy unity install 6000.3.26f1 --architecture arm64 --non-interactive --json
rtk proxy unity projects create Unity3D --path ./spikes --editor-version 6000.3.26f1 \
  --template com.unity.template.urp-blank --with-pipeline --no-cloud
rtk proxy unity open ./spikes/Unity3D
rtk proxy unity status --json
```

La création, l’ouverture et la liaison au projet Cloud propre au spike sont terminées.
Ne pas réutiliser un projet de production.

## Ce qui reste à mesurer

En scène : triangles, matériaux, textures, appels de rendu et complexité de l’animation.
Sur appareil : temps de démarrage, taille du build, mémoire, fluidité, consommation perceptible
et reprise après fermeture de la scène. Distinguer chaque plateforme réellement testée.
Une mesure de l’éditeur macOS ne représente ni l’iPhone ni Android.

L’intégration Expo est une question distincte : Unity as a Library documente le plein écran
mobile et 80–180 Mo conservés après déchargement. Le spike doit expliciter le parcours combat
et le traitement de l’avatar équipé dans le profil/inventaire avant une décision de migration.
Le backend reste l’arbitre des combats ; un moteur graphique ne déplace pas les règles de jeu
sur le client.

## État initial constaté

- Aucun éditeur, Hub, compte connecté ou licence active sur cette machine au démarrage.
- CLI installée et checksum vérifié par l’installeur ; aide, versions, catalogue de templates,
  état de connexion et licences interrogés réellement.
- Téléchargement de l’éditeur lancé (5 189 868 460 octets, sans modules mobiles).
- Connexion OAuth ouverte dans le navigateur ; action demandée à l’auteur.
- La création du projet a été essayée avec la CLI et refusée parce que l’éditeur n’est pas
  encore installé (`PROJECTS_CREATE_ERROR`). Aucun projet exécutable n’a donc été créé.
- Le catalogue réel de la CLI décrit `Unity AI Generators` (`ai`, 0.1.0-alpha.13) comme
  une alpha interne non publique. Ne pas confondre ce plugin avec les générateurs publics
  de l’éditeur. Aucun contournement d’accès ni installation d’un outil réservé au personnel.
- Aucun personnage ni objet n’a encore été généré. Aucune qualité visuelle, performance ou
  compatibilité native n’est donc validée à ce stade. Le spike n’est pas terminé.

## Reprise après connexion du 18 octobre — historique de préparation

- Installation terminée : 6000.3.26f1 arm64 dans `/Applications/Unity/Hub/Editor/`.
- La première connexion OAuth avait expiré. La nouvelle connexion est validée (`sessionState:
  fresh`). Aucun identifiant ou jeton n’est conservé dans le dépôt.
- La création a extrait le template Universal 3D, puis l’éditeur s’est arrêté avec le code 198
  avant import faute de licence. Le squelette du projet ne constitue pas une exécution réussie.
- L’activation des droits existants répond `activated: true, products: []`, mais la vérification
  effective répond `active: false, licenses: []`. C’est cette dernière qui fait foi.
- L’activation Personal exige `--accept-eula` : accord explicite demandé à l’auteur avant cette
  étape, avec le lien des conditions Unity. Elle n’a pas encore été exécutée.
- Projet enregistré localement. Version d’éditeur renseignée pour préparer le package Pipeline
  officiel 0.8.0-exp.1 ; aucune instance de l’éditeur n’est active.
- Versions IA lues dans le registre officiel : Assistant 2.20.0-pre.2 et Generators
  1.7.0-pre.1, compatibles selon leurs métadonnées avec Unity 6000.0.60f1 et suivants.
  Dépendances déclarées avant le premier import, donc non encore compilées ou testées.
- La liaison Cloud via CLI a répondu HTTP 400 ; la lecture suivante ne montre aucun nouveau
  projet. Reprendre la liaison dans l’éditeur une fois le projet initialisé, sans utiliser le
  projet personnel préexistant de l’auteur.
- Neuf briefs sont préparés dans `spikes/Unity3D/Assets/Spike/GenerationBriefs.json`, explicitement
  marqués `prepared-not-generated`. Le package contient un mannequin humanoïde riggé pour ses
  aperçus d’animation ; il peut servir de banc technique, pas de validation de DA.

Ces constats décrivent la préparation avant acceptation de la licence ; l’état actuel suit.

## État après acceptation de Personal

- Accord explicite de l’auteur reçu ; Personal activé et état `active: true` vérifié.
- Éditeur 6000.3.26f1 ouvert, compilation terminée sans erreur C#.
- Assistant 2.20.0-pre.2 inclut déjà les générateurs. Le package Generators 1.7 séparé a été
  retiré : leur installation simultanée créait des doublons de GUID et d’assemblies.
- Input System du template mis à jour de 1.12 à 1.20.1 : la version initiale référençait une
  cible supprimée dans cet éditeur. Migration URP 17.3 effectuée par Unity.
- Projet Cloud créé et lié dans l’éditeur : `GRRIND Unity Spike`,
  `0f197e79-1fb9-4578-800f-af10c5c6c7ab`, organisation `younesdiouri`.
  Aucun achat ni abonnement payant.
- L’activation IA présente un nouvel accord : conditions Unity et fournisseurs IA, crédits,
  collecte des données d’usage, confidentialité des fonctionnalités bêta. Accord distinct
  soumis à l’auteur ; ne pas assimiler l’acceptation de Personal à celle de l’IA.
- Le code du package actuel expose des étapes de rigging et de remaillage après génération.
  Elles restent à essayer avec le compte ; la documentation initiale sur les objets sans
  squelette ne suffit donc pas à conclure sur les capacités du pipeline actuel.
- Banc reproductible : `AgentScripts/BuildBench.cs`, entrée `BuildBench.Create`, exécutée
  via la commande officielle `run_script`. Scène sauvegardée : `Assets/Spike/Bench.unity`.
  Le FBX humanoïde fourni par Unity possède 5 renderers et des os tête/main droite reconnus.
  Le prefab d’aperçu retire le mesh ; le banc utilise donc directement son FBX d’origine.
- Mode Play vérifié : compteur de frames passé de 480 à 512, condition `changed` satisfaite,
  puis sortie du mode Play. Rendu caméra 1000 × 1000 inspecté. Capture écran redimensionnée
  déformée par son rapport d’aspect : ne pas la prendre pour une preuve de proportions.
- La console signale aussi des échecs de rafraîchissement des conversations/modèles Assistant
  avant activation IA. À réévaluer après l’accord ; le rendu local et la compilation fonctionnent.
- Aucune animation de combat, prise d’arme, occlusion de lunettes, seconde morphologie ou
  performance mobile validée. Aucun asset IA généré à ce stade. Le spike reste incomplet.

## Accord IA accepté — accès commercial absent

- L’auteur confirme avoir accepté les conditions IA. L’écran d’accord a disparu.
- L’Assistant affiche : organisation sans abonnement incluant l’IA et compte sans siège.
  Le Dashboard confirme `No bundles or subscriptions`. Ce blocage est distinct de la licence
  Personal et de l’acceptation des conditions.
- Parcours ouvert jusqu’au récapitulatif de l’offre : essai 14 jours, 1 000 crédits,
  0 $ au départ, puis 10 $/mois hors taxes, renouvellement mensuel, résiliation possible.
  Le formulaire requiert un moyen de paiement. Aucun essai ni achat confirmé par l’agent.
  Choix demandé à l’auteur ; le formulaire est laissé ouvert pour saisie personnelle.
- En parallèle, `AgentScripts/InspectHead.cs` construit une monture technique temporaire
  en primitives et l’attache au bone Head. Ce n’est ni un asset IA ni une proposition de DA.
  Gros plans examinés à 35°, 90°, de dos et tête tournée de 60°. La première calibration
  était trop haute et trop en avant ; correction de 15 mm vers le bas et 12 mm vers l’arrière.
- Contrôle en Play après avance vérifiée des frames : la tête masque la branche opposée,
  la monture suit la rotation et les lunettes disparaissent de la vue arrière. Cela démontre
  l’occlusion géométrique de ce montage, pas la qualité finale d’un équipement ou son adaptation
  à plusieurs visages. Les branches droites n’ont pas encore de crochet d’appui sur les oreilles.
- Les premiers exports en édition pouvaient montrer le mesh skinné de la frame précédente.
  Ils sont exclus des preuves de rotation. Le contrôle fiable utilise Play, le rendu des skins
  hors champ et une avance de frame avant capture. L’exécution en arrière-plan a été rétablie
  à sa valeur précédente après le test. La scène de base conserve le mannequin sans cette fixture.
- Preuves locales retenues : `artifacts/unity-spike/head-play-turn-60-fixed.png`,
  `head-play-back.png`, `head-fit-reviewed.png` et `unity-ai-trial.png`.
  Les nombreuses primitives de la fixture ne représentent pas le budget de rendu final.

Sources d’accès relues : [offre IA actuelle](https://unity.com/features/ai),
[prix](https://unity.com/products) et formulaire Unity Store réellement affiché.
Génération, rigging automatique et animations IA restent non testés tant que l’accès est absent.

## Essai activé par l’auteur — crédits non provisionnés

- Le Dashboard confirme l’abonnement AI actif en essai du 18 octobre au 1er novembre 2026,
  avec le siège de l’auteur attribué (1/1). Ne plus demander d’activation ou d’achat.
- Après rafraîchissement réel auprès des services, `AiGeneratorsEnabled` et `CanSpendPoints`
  valent true. L’organisation du projet, celle de facturation et celle du solde sont toutes
  `9071006223181`. Le service renvoie pourtant `PointsAllocated: 0, PointsAvailable: 0`.
  Le Dashboard affiche également `No bundles or subscriptions` dans Manage credits, tandis
  que My Products affiche l’essai actif. Cette incohérence empêche la génération.
- Le catalogue des modèles est accessible : Tripo 3.1/P2, Hunyuan 3.1, rigging bipède Tripo,
  Unity Text to Motion et Uthana sont notamment listés. Leur présence ne prouve pas une
  génération réussie ou la qualité de leurs résultats.
- Sonde reproductible `AgentScripts/GeneratorProbe.cs` : `RefreshAccess`, `Models`,
  `QuoteReference`. Elle lit l’API interne de la façade Assistant 2.20 via réflexion dans ce
  spike isolé ; aucun changement des droits, du solde ou du package installé. Cette liaison
  n’est pas un contrat d’intégration de production.
- Un essai de devis 3D Tripo 3.1 à partir du texte du brief est refusé avant génération :
  image de référence requise, malgré `SupportsTextPrompt` dans la description du catalogue.
  Un devis d’image Gemini 3.1 Flash 1024 × 1024 avec suppression du fond aboutit : 5 crédits.
  Le callback annule avant création d’asset et avant génération. Aucune dépense ni asset IA.
- L’incident de crédit reste externe et non résolu. Des témoignages sur le forum Unity
  décrivent une arrivée des crédits différée ; il s’agit d’un indice, pas d’une cause
  démontrée ni d’une garantie de délai pour ce compte.
- Preuve locale : `artifacts/unity-spike/unity-ai-empty-balance.png`.
  Brouillon de demande au support préparé localement, non envoyé.

Sources : [crédits indisponibles](https://docs.unity.com/en-us/ai/credits/credits-troubleshoot),
[témoignages sur l’essai](https://discussions.unity.com/t/ai-free-trial-isnt-working/1721860).

## Sources officielles

- [CLI : installation et pilotage](https://docs.unity.com/en-us/unity-cli/use-unity-cli).
- [Générateur 3D](https://docs.unity.cn/Packages/com.unity.ai.assistant@2.3/manual/3d-terrain/3d-generator-overview.html) :
  objets simples, monoblocs, sans squelette ni animation. Sa disponibilité ne prouve pas
  un workflow complet de personnage jouable.
- [Outils IA Unity](https://unity.com/features/ai) : assistant et contrôle par agent.
- [Unity as a Library](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/cross-platform-features/unityasa-library) :
  limites du rendu embarqué et mémoire résiduelle.
