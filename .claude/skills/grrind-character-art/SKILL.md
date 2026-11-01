---
name: grrind-character-art
description: Concevoir, générer et intégrer les équipements sportifs facettés de GRRIND sur les avatars Quaternius, avec essai iPhone. Sert aussi de point d’entrée pour les corps, mobs et animations Unity ; pas pour l’équilibrage ni une refonte du front.
---

# Art 3D GRRIND

## Références et périmètre

Lire la [DA actuelle](../../../docs/design/da-facettee.md), puis le
[brief et la préparation des références](references/item-production.md).
Les captures récentes et le concept approuvé guident le rendu. Les anciennes planches
Fantasy, Synty et corps Meshy sont historiques. Les deux corps Quaternius, leurs rigs et
leurs choix d’apparence existants restent la base ; aucun nouveau corps humain à générer.

Préciser dans le brief la livraison attendue : **concept**, **essai atelier/iPhone**, ou
**item du catalogue jouable**. Une validation d’image ne valide pas encore le modèle porté.
Une demande d’essai sur téléphone autorise l’intégration du pilote pour ce jugement ; elle
n’exige pas une nouvelle approbation entre chaque étape technique. Respecter le périmètre
serveur convenu : un pilote d’atelier ne crée ni loot ni persistance de compte.

## Choisir le parcours utile

| Objet à produire | Référence à charger |
| --- | --- |
| Coiffe ou accessoire rigide attaché à un os | [Ajustement et intégration](references/rigid-equipment.md) |
| Arme ou objet tenu | [Prise, animation et collisions](references/held-weapons.md) |
| Vêtement déformable ou chaussures | [Rig, peau et raccords](references/deforming-clothes.md) |
| Corps, mob ou animations | [Contraintes des personnages et mouvements](references/characters-and-motion.md) |
| Connexions d’outils, installation et ouverture sur iPhone | [Outils et livraison](references/tools-and-iphone.md), au moment utile |

ImageGen sert aux concepts et vues dérivées ; Meshy aux formes qui justifient une génération ;
Blender aux ajustements reproductibles ; Unity au rendu et aux attaches. Utiliser les outils
livrés, MCP ou CLI officiels, avant du code maison. Pour une forme ou un rig nouveau, utiliser
les étapes pertinentes de `blender-image-to-3d` ; les checks choisis suivent `AGENTS.md`.

## Vérifier et livrer

- Contrôler d’abord silhouette, dimensions, orientation et ouverture/prise sur le vrai avatar.
  Corriger l’asset avant d’ajouter des détails. Après deux corrections infructueuses du même
  défaut, reprendre le brief ou la référence.
- Vérifier les risques de la famille d’objet et exécuter les validations Unity concernées.
  Une coiffe rigide n’exige pas le parcours complet de retopologie d’un personnage.
- Livrer l’essai dans l’atelier de **GRRIND dev**, accessible depuis Réglages, et transmettre
  le paramètre de l’item pour le présélectionner. Tester homme/femme selon le périmètre.
- Le jugement visuel final appartient à l’auteur sur iPhone, au cadrage réel de l’app.
  Consigner son retour avec sa portée : concept, modèle porté, variante, mouvement.
- Suivre `docs/ai/mobile-qa.md` pour les builds et checks : JS via Metro ; nouvelle donnée
  Unity embarquée via la tranche Device. La PR dit où essayer l’item et ce qui reste à juger.
