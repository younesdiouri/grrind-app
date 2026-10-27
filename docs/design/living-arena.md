# Arène vivante — #316

La clairière facettée accueille deux tribunes et 18 spectateurs Quaternius en tenues
colorées. Le centre reste dégagé pour les deux combattants. Un arbitre chauve en noir
et blanc donne le départ : 3, 2, 1, FIGHT, puis s’éloigne par l’allée centrale. Le
sifflement dure 300 ms et respecte le mode silencieux du téléphone.

L’ouverture dure 3,4 s ; le sifflet part à 2,4 s. Le public alterne des gestes
d’encouragement et lève les deux bras en sautant sur un critique. Tout est échantillonné
sur l’horloge du rejeu, sans horloge indépendante ni calcul de jeu. Réduire les animations
conserve le compte à rebours lisible, supprime les sauts/balancements et place directement
l’arbitre en retrait. Le décor ne s’affiche ni dans Apparence ni dans le raid.

Les six meshes de public sont partagés, sans Animator par spectateur : 201 672 triangles
affichés au total, sans ombres projetées par le public. L’arbitre garde un seul Animator
piloté manuellement. Aucun collider n’est ajouté à la scène et aucun post-traitement
de flou supplémentaire n’est requis. Matériaux Painted Toon et corps existants ; aucune
génération payante. La provenance et le builder sont dans `spikes/art-source/living-arena/`.

## Preuves

Captures Unity de présentation, avec le vrai HUD et un viewport mobile, demandées à
2622 × 1206 via `capture_game_view` ; ce ne sont pas des captures de l’app sur l’iPhone.
Les points de vie affichés ici appartiennent au scénario de contrôle, pas à un compte.

![Départ et arbitre](living-arena/intro.png)
![Contact PvE et réaction du public](living-arena/pve-contact.png)

`LivingArenaChecks.Run()` contrôle les gestes visibles, le saut critique (au moins
13,6 cm dans le scénario échantillonné), le compte à rebours réel, le retrait de l’arbitre,
le rejeu, l’immobilité d’une horloge figée, Réduire les animations et l’aller-retour
inspection/combat. Les contrôles Quaternius de contact passent (15,5 et 20,1 cm).

Le contrôle existant de la clairière passe : 924 volumes de personnage, zéro chevauchement
avec le décor. Les douze points de projection restent à moins de 0,000092 px du cadrage
de référence. Le contrôle complet a utilisé le job détaché officiel Unity, car ses 6,7 s
dépassent le délai de cinq secondes de `eval` direct.

La correction #315 rétablit le moveset de Cailloux, les sockets du rig Generic et sa chute
de KO. Cinquante échantillons passent, avec un appui au sol à moins de 0,4 mm de la référence.
Les effets sont désormais calculés après la pose, avec un ancrage corporel proche du poing ;
un contrôle vérifie que les étincelles ne restent pas à l’ancienne position. Le HUD du mob
utilise ses sockets réels. La console finale ne contient aucune erreur ou alerte.

TypeScript, lint, 608 tests et 31 previews déterministes passent. Le framework iPhone a
été exporté et compilé, puis installé sur l’iPhone via `devicectl`. L’UUID embarqué
`556DB339-1350-314F-8F76-0113ABFB4418` et les SHA-256 des 16 fichiers Data correspondent
à l’export. La fluidité, les contacts et la lisibilité restent à juger par l’auteur sur
son iPhone avant push. Aucun EAS/TestFlight et aucune reconstruction du Simulator.
