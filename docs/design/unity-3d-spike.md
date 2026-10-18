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

La création et l’ouverture restent à exécuter après installation et activation. Lier ensuite
le projet Cloud du spike au compte autorisé pour les générateurs ; ne pas réutiliser un projet
de production ni configurer une organisation à partir d’informations personnelles supposées.

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

## Sources officielles

- [CLI : installation et pilotage](https://docs.unity.com/en-us/unity-cli/use-unity-cli).
- [Générateur 3D](https://docs.unity.cn/Packages/com.unity.ai.assistant@2.3/manual/3d-terrain/3d-generator-overview.html) :
  objets simples, monoblocs, sans squelette ni animation. Sa disponibilité ne prouve pas
  un workflow complet de personnage jouable.
- [Outils IA Unity](https://unity.com/features/ai) : assistant et contrôle par agent.
- [Unity as a Library](https://docs.unity.com/en-us/engine/6000.3/manual/platform-specific/cross-platform-features/unityasa-library) :
  limites du rendu embarqué et mémoire résiduelle.
