# Inventaire RPG — #308

## Périmètre demandé

Une grille d’objets lisible au doigt, dans la DA nuit/cyan de GRRIND : illustration,
rareté, nom, quantité, badge équipé. Catégories Tous / Armes / Tenues / Composants /
Coffres. Une case ouvre la fiche puis les gestes existants. Le sac personnel s’ouvre
sur la grille ; Équipement conserve le vrai personnage capturé par Unity (#307).

React Native / Expo 57 pour cette interface. Aucun changement Unity, natif, API ou
backend ; aucun push, PR, merge ou build avant le test de l’auteur sur son iPhone.

## Plan et vérifications

1. Filtrer à partir de `kind` et `slot`, garder les quantités et les objets portés.
   Vérifier avec les tests Node de `src/features/inventory/inventory.test.ts`.
2. Ajouter `InventoryGrid` et les filtres ; reprendre `ItemIllustration` et les tokens.
   Vérifier noms accessibles, quantités et badge équipé avec le rendu RN Web réel.
3. Brancher la fiche dans l’écran et la grille des objets compatibles. Conserver
   les mutations, leurs verrous, confirmations et résultats serveur. Vérifier les
   actions de fiche avec un test du composant réel.
4. Générer les previews depuis les composants RN. Exécuter `npm run typecheck`,
   `npm run lint`, `npm test`, puis `npm run previews:check` sur l’état enregistré.
5. Servir par `npm start` sur Metro 8081 pour le binaire iPhone déjà installé.
   L’auteur vérifie visuel, filtres, fiche, équiper/retirer et capture actualisée.

## Conventions et limites

Composants dans `src/components`, état et sélection dans l’écran d’inventaire,
présentation typée dans `src/design/tokens.ts`. Exemple :
`<ItemIllustration item={line} tint={rarityColor[line.rarity]} />`.
Les valeurs et quantités proviennent toujours du contrat. Aucune logique de jeu.
Pas de nouvelle dépendance. Pas de Maestro : le flux serveur ne change pas.

## État

- [x] Dernières PR #307, #305, #303 et DA des objets #300/#301 lues.
- [x] Ticket créé ; branche locale dédiée, main à jour et propre au départ.
- [x] Implémentation et contrôles locaux terminés.
- [ ] Validation de l’auteur sur son iPhone.
- [ ] Push autorisé après le test.

## Preuves locales

- `npm run typecheck` et `npm run lint` : sortie 0.
- `npm test` : 591 tests réussis, aucun échec ni test ignoré.
- 30 previews générées ; contrôle déterministe `npm run previews:check`.
- Preview RN Web à 390 pt : cases 108,66–108,67 pt de côté, filtres 44 pt,
  bouton de fiche 56 pt. Les cinq catégories sont visibles sur deux rangées.
- Les neuf YAML touchés sont syntaxiquement valides ; flows non exécutés,
  conformément à la validation visuelle par l’auteur et au flux serveur inchangé.
- Metro 8081 : bundle iOS HTTP 200, 1 234 modules, 2,9 s ; aucun rebuild natif.
  Le serveur reste disponible pour le téléphone. Aucun push ni PR.
