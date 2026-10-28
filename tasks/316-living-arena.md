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

Après le retour auteur du 28 octobre, le public encourage avec cinq vrais gestes Mixamo
reciblés sur les deux bases Quaternius. Chaque spectateur garde un geste, une phase et
une vitesse propres ; les meshes et matériaux restent partagés. Les 18 Animators et
l’arbitre partagent un seul graphe manuel. La réaction collective aux critiques est
retirée. Réduire les animations fige le public et le retrait de l’arbitre. L’horloge RN
pilote tout, y compris le rejeu et les sauts au bilan. Aucun calcul de dégâts, nouvelle règle, physique ou collider de décor.

## Slices et sources

- [x] Assets via l’éditeur officiel : prefab `Resources/LivingArena`, tribunes, arbitre,
  deux prefabs de public nettoyés et cinq clips Humanoid Mixamo en boucle.
- [x] Présentation Unity : vie du public, arbitre et compte à rebours ; activation duel
  uniquement, disparition en inspection/raid, décor discret au bilan.
- [x] Bridge RN : temps et ouverture dans `unityPresentationAt`, durée d’intro et sifflet
  par expo-audio existant. Valeurs et ordre serveur conservés.
- [x] Contrôles : synchronisation/skip/rejeu, mouvement réduit, dégagement de la piste,
  deux côtés, retour inspection/raid. Captures ciblées au cadrage mobile, console sans erreur.
- [x] Export du framework Device uniquement et development build installé sur l’iPhone.
- [x] Validation auteur sur iPhone ; livraison autorisée le 28 octobre.

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
public encourage de façon fluide et indépendante des critiques. Le choix du flou reste optionnel : privilégier
profondeur, taille et contraste sans ajouter un post-traitement coûteux pour le téléphone.

## Résultat technique

Première itération livrée : 18 spectateurs et 201 672 triangles de public. Le saut
collectif sur critique de cette itération est retiré à la demande auteur. Le compte à
rebours, le rejeu et le mouvement réduit restent couverts.
924 volumes testés sans chevauchement, 12 projections conservées à moins de 0,000092 px.
TypeScript/lint, 608 tests et 31 previews déterministes au vert. La route combat compile
via Metro 8081 en HTTP 200.

Framework Device compilé et development build installé via `devicectl`. UUID embarqué
`3BF58925-CA64-366E-BE50-3F4DC7164A6B` et SHA-256 des 16 fichiers Data concordants.
GRRIND dev a été lancé sur l’iPhone après déverrouillage le 28 octobre, via Metro 8081. La revue du rendu, du son et de la fluidité reste à l’auteur.
La slice Simulator conserve sa scène antérieure ; aucun flow visuel Simulator n’est
présenté comme une validation de la nouvelle arène. Aucun push/PR/merge ou EAS.

## Retour auteur — 28 octobre

« franchement lourd de fou » ; corriger le mouvement de main du public et retirer
la réaction collective aux critiques. Référence : catalogue Mixamo cheer.

Plan : retirer d’abord le déclenchement sur critique avec contrôle de non-réaction ;
puis remplacer les poses statiques par plusieurs clips Humanoid Mixamo réellement
reciblés sur les deux bases existantes. Chaque spectateur garde un geste, une phase
et une vitesse propres. Un seul graphe manuel suit le temps du rejeu ; aucune horloge
libre, allocation par frame ou nouvelle règle de combat. Les mêmes 18 personnes restent
dans les mêmes gradins. Réduire les animations fige le public, le bilan et le rejeu
restent déterministes. Contrôler continuité des mains/appuis, absence de réaction aux
critiques, coût des 18 rigs et retour inspection. Puis framework Device et iPhone,
sans push avant retour auteur.

### Contrôles du public continuellement animé

Cinq clips Mixamo d’origine importés sans skin, à 30 fps, Humanoid avec Loop Pose.
Les applaudissements initiaux n’avaient que 4,3 cm de course de main : régler Intensity
et Height à 100 dans la source les rend plus visibles, sans rotation d’os artificielle.
Le contrôle final de 400 pas (25 ms, dix secondes) passe : chaque personne bouge
d’au moins 9,56 cm, déplacement maximal d’une main par pas 11,04 cm. Aucun déplacement
ou changement de geste à l’arrivée d’un critique ; horloge figée, rejeu, mouvement réduit,
inspection et décompte passent. Toujours 201 672 triangles. Le graphe manuel de 18
spectateurs + arbitre coûte 0,113 ms par échantillon sur ce Mac (1000 appels ; ce chiffre
ne mesure pas les performances GPU ou la fluidité de l’iPhone). Console finale vide.
Les contacts de duel existants restent contrôlés à 14,4 / 15,2 cm.

Framework Device mis à jour compilé et app Debug signée (0 erreur, une alerte Expo
déjà connue). Expo reste en attente de connexion au téléphone ; arrêter uniquement
ce lanceur après compilation puis installer et lancer avec le CLI Apple `devicectl`
réussit. UUID embarqué `3BF58925-CA64-366E-BE50-3F4DC7164A6B` et SHA-256 des 16 fichiers Data
identiques à l’export. Version installée et lancée le 28 octobre via Metro 8081.
La validation des cinq gestes et de la fluidité sur iPhone reste à l’auteur. Aucun push.

## Validation et livraison — 28 octobre

L’auteur valide la version installée : « franchement mon gars vraiment bien joué c’est vraiment lourd. Tu peux push main merge déployer etc. que ça soit back ou front tu gères ».
L’interdiction de push est levée pour ce lot ; fusionner les trois tickets puis lancer
un build EAS production et sa soumission TestFlight. TypeScript/lint, 608 tests et
31 previews passent sur le code final. La vérification du candidat de production
reste distincte de cette validation du development build.

Smoke de sortie passé : `.maestro/ios-smoke.yaml`, 183 s de cycle, sans build natif
Simulator. Archive EAS vérifiée : 59 fichiers de framework identiques, aucun fichier
source Unity inclus. Le suivi de la livraison EAS/TestFlight se poursuit dans le ticket.
