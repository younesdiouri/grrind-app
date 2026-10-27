# #310 — Boutique RPG

Ticket : https://github.com/younesdiouri/grrind-app/issues/310

## Intention

Transformer l’étal en boutique de jeu désirable, dans le prolongement de #308 : nuit,
cadres techniques, Oxanium, cyan et monnaie cuivrée. Les références de l’auteur guident
la hiérarchie (grandes illustrations, socles lumineux, prix et CTA), pas leurs matériaux bois.
Peu de texte ; la rareté se voit en couleur et s’annonce à VoiceOver.

## Réalisation

- [x] Vitrine d’un équipement non possédé et débloqué, sinon objet disponible puis premier du catalogue.
- [x] Catalogue à deux colonnes, filtres Tous / Équipement / Coffres ; aucune donnée masquée par défaut.
- [x] Illustration sur halo radial, faisceau, socle et étincelles sobres ; fiches agrandies.
- [x] Achat depuis la fiche seulement ; états serveur conservés, refus et succès dans la fiche.
- [x] Prix et effets serveur, fermeture possible pendant l’attente sans résultat perdu.
- [x] Actualisation du solde et du sac avec les mutations idempotentes existantes.
- [x] Preview du vrai composant, états vide/verrouillé/possédé, vérifications puis Metro iPhone.
- [x] Validation visuelle par l’auteur : « Ok vraiment bien tu peux push ».

## Périmètre technique et vérification

React Native / Expo 57, `react-native-svg` et `expo-image` déjà installés.
`src/components/Shop*.tsx` compose le catalogue et la fiche ; `boutique.tsx` garde les
requêtes et mutations ; les dimensions et couleurs ajoutées restent dans `tokens.ts`.
Exemple : `const control = purchaseControl(item)` ; aucune règle d’achat reconstruite.
Tests Node sur les composants réels via RN Web : accessibilité, états et valeurs serveur.
Commandes : `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`,
`rtk npm run previews`, puis `rtk npm run previews:check` après commit local.
Vérification du bundle iOS sur Metro 8081, sans rebuild du development build installé.

## Limites

Aucun changement backend, prix, loot, API, Unity, dépendance ou projet natif.
Aucun compte E2E ni flow Maestro : le flux serveur d’achat reste identique.
Ne jamais pousser, ouvrir de PR ou fusionner avant le feu vert de l’auteur.

## Résultat local — 27 octobre 2026

Branche `feat/310-rpg-shop`. Typecheck et lint : sortie 0. 591 tests réussis,
aucun échec ni test ignoré ; cinq nouveaux tests de présentation et de valeurs serveur.
30 previews générées depuis les composants natifs. Cartes mesurées à 165 pt sur écran
390 pt et 130 pt sur écran 320 pt, sans débordement horizontal ; filtres de 44 pt.
Les vignettes 3D publiées sont réutilisées sur fond transparent ; aucune nouvelle image.
L’illustration Fer Play existante répond HTTP 200 sur le backend local, consulté en lecture seule.
Metro 8081, déjà actif pour le téléphone, sert le bundle iOS : HTTP 200, 5 916 130 octets.
Aucun rebuild. Le téléphone est actuellement indisponible pour `devicectl` ; ouvrir/recharger
GRRIND dev → Inventaire → Boutique sur le réseau du Mac. Regarder la vitrine, les halos,
les cartes, puis la fiche avant achat. Le jugement visuel sur iPhone reste à l’auteur.
Ni Maestro ni build EAS/TestFlight : flux serveur, projet natif et Unity inchangés.

Docs consultées avant code : Expo SDK 57 et ses pages `sdk/svg/` et `sdk/image/`.

## Feu vert de l’auteur

Le 27 octobre 2026, l’auteur valide le rendu et autorise le push. Livraison par PR vers
`main` suivant le workflow du dépôt, sans nouveau build.
