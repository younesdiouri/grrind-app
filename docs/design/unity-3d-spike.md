# Spike Unity 3D et génération IA

Ticket : https://github.com/younesdiouri/grrind-app/issues/213.

## Objectif approuvé

Le 18 octobre 2026, l’auteur autorise un prototype Unity 3D avec les outils IA officiels.
Les personnages, objets et le pixel art précédents peuvent être remplacés. L’app sportive
et le plaisir de s’équiper restent l’intention ; aucune migration de production n’est autorisée
par ce spike. Le verdict doit reposer sur des captures réelles et des mesures disponibles.

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
