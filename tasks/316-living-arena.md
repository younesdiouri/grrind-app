# #316 — Arène vivante

Ticket : https://github.com/younesdiouri/grrind-app/issues/316

## Intention et critères

Faire du duel PvE/PvP un petit événement sportif dans la clairière facettée existante.
Garder les deux protagonistes et leurs impacts au premier plan. Deux tribunes en bois
sombre/acier, assises colorées, neige sur les marches et 18 spectateurs Quaternius répartis
en deux groupes. Aucune nouvelle base humaine ou génération payante.

Arbitre Quaternius chauve : t-shirt à bandes noires/blanches, pantalon noir et sifflet.
Départ lisible 3–2–1–FIGHT, environ 3,4 s au total ; geste de départ puis déplacement de
l’arbitre en fond de piste, sans chevaucher les combattants. Le sifflement est court et
respecte le mode silencieux déjà utilisé pour les impacts.

Le public encourage avec des poses pré-échantillonnées des mêmes avatars, des rythmes
variés et un saut sur les critiques. La géométrie est réutilisée entre spectateurs ; pas
de rig ou d’Animator par spectateur. Réduire les animations supprime les sauts/balancements
et le retrait animé de l’arbitre. L’horloge RN pilote tout, y compris le rejeu et les sauts
au bilan. Aucun calcul de dégâts, nouvelle règle, physique ou collider de décor.

## Slices et sources

- [x] Assets via l’éditeur officiel : prefab `Resources/LivingArena`, tribunes, arbitre,
  six meshes de public partagés (deux corps existants et trois poses).
- [x] Présentation Unity : vie du public, arbitre et compte à rebours ; activation duel
  uniquement, disparition en inspection/raid, décor discret au bilan.
- [x] Bridge RN : temps et ouverture dans `unityPresentationAt`, durée d’intro et sifflet
  par expo-audio existant. Valeurs et ordre serveur conservés.
- [x] Contrôles : synchronisation/skip/rejeu, mouvement réduit, dégagement de la piste,
  deux côtés, retour inspection/raid. Captures ciblées au cadrage mobile, console sans erreur.
- [x] Export du framework Device uniquement et development build installé sur l’iPhone.
- [ ] Validation auteur avant push. Aucun EAS/TestFlight.

Builder/contrôles dans `spikes/Unity3D/Assets/Editor`, comportement dans `Assets/Spike`.
Réutiliser les Playables, les matériaux Painted Toon et la police Oxanium existants.
Sources d’assets sous `spikes/art-source/living-arena/` avec provenance. Pas de YAML
Unity construit à la main ; le CLI pilote les créations/captures dans l’éditeur.

## Vérification et commandes

`rtk proxy /Users/younesdiouri/.unity/bin/unity recompile --project-path
/Users/younesdiouri/Desktop/grrind-app/spikes/Unity3D --json`, contrôles du jeu réel via
la commande officielle `eval`, puis `screenshot`. Contrôles existants Cailloux,
Quaternius et projection de la clairière selon ce qui change ; pas de balayage E2E visuel.
Tests Node ciblés sur les échantillons d’ouverture ; une fois sur le code final :
`rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`, `rtk npm run previews:check`.
Export : `rtk proxy env UNITY_IOS_TARGETS=Device ./scripts/unity-ios.sh`, puis
`rtk npm run ios` pour installer le seul build de développement affecté.

Les captures et mesures doivent montrer que la piste reste dégagée, que l’arbitre est
en retrait au premier coup, que les gradins restent derrière les acteurs et que le
public change de pose/hauteur sur critique. Le choix du flou reste optionnel : privilégier
profondeur, taille et contraste sans ajouter un post-traitement coûteux pour le téléphone.

## Résultat technique

Les contrôles passent : 18 spectateurs, 201 672 triangles de public partagés, saut critique
minimal de 13,6 cm dans l’échantillon, compte à rebours réel, rejeu et mouvement réduit.
924 volumes testés sans chevauchement, 12 projections conservées à moins de 0,000092 px.
TypeScript/lint, 608 tests et 31 previews déterministes au vert. La route combat compile
via Metro 8081 en HTTP 200.

Framework Device compilé et development build installé via `devicectl`. UUID embarqué
`556DB339-1350-314F-8F76-0113ABFB4418` et SHA-256 des 16 fichiers Data concordants.
Le verrouillage de l’iPhone empêche le lancement automatique ; ouvrir GRRIND dev après
déverrouillage. La revue du rendu, du son et de la fluidité reste à l’auteur.
La slice Simulator conserve sa scène antérieure ; aucun flow visuel Simulator n’est
présenté comme une validation de la nouvelle arène. Aucun push/PR/merge ou EAS.
