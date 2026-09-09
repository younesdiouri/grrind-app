# Vente d’équipement — #166

## Spécification validée

Vendre un exemplaire depuis le sac, ou un doublon équipé, après confirmation du nom et du
prix serveur. Le dernier exemplaire équipé invite à retirer l’objet. Coffres exclus. Un prix
de zéro reste explicite et valide. EasyAdmin et le calcul économique appartiennent au backend.

Le POST transmet le prix confirmé et une clé d’idempotence persistante. Un changement de prix
impose une nouvelle lecture puis une nouvelle confirmation. Une panne ne doit pas produire une
seconde vente lors du retry. Inventaire, boutique et bourse suivent la réponse serveur.

## Plan

1. Vérifier le parcours existant sur Metro iOS et lire ses captures.
2. Importer l’OpenAPI généré de grrind-back#271 et régénérer les types.
3. Prouver les retries de vente, ajouter l’action et les traductions métier.
4. Intégrer la confirmation et les boutons distincts dans l’inventaire.
5. Vérifier tests, types, lint, previews, contrat et parcours iOS, puis pousser et ouvrir la PR.

## Checklist de livraison

- [x] Ticket et instructions lus, branche dédiée créée, état initial propre.
- [x] Metro iOS préparé sans rebuild natif.
- [x] Baseline iOS et captures inspectées.
- [x] Contrat backend véritable importé et types générés.
- [x] Tests de retries, refus et succès.
- [x] Vente avec confirmation, annulation et verrouillage des mutations.
- [x] Doublon équipé vendable et dernière unité équipée protégée.
- [x] Caches et historique des pièces à jour.
- [x] Typecheck, lint, tests, previews et contrat validés.
- [x] QA iOS après modification et captures inspectées.
- [x] Branche poussée et PR ouverte, dépendance backend indiquée.

## Limites de validation

La validation Release complète n’est pas autorisée. Le flow Metro est la barrière mobile.
Le contrat est vérifié contre la branche backend tant que celle-ci n’est pas fusionnée.


## Preuves

- Baseline `e2e:ios:dev` puis smoke : 4 min 26 s, aucun build natif. Captures
  `artifacts/e2e/2026-09-08_152638/ios-smoke/takeScreenshot/09-bag.png` et
  `10-bag-equipped.png` inspectées.
- Flow vente : 1 min 48 s, confirmation/annulation, dernière unité libre, doublon équipé,
  protection du dernier exemplaire porté et coffre exclu. Captures inspectées sous
  `artifacts/e2e/2026-09-08_153424/inventory-sales/takeScreenshot/`.
- TypeScript strict, lint sans avertissement, 521 tests et 28 previews inchangées passent.
- OpenAPI importé du commit backend `f2258fb` (PR grrind-back#272), identité vérifiée par `cmp`,
  types régénérés avec `api:generate`. `api:check` main volontairement remplacé par cette
  vérification de branche autorisée : le backend n’est pas encore fusionné.
- API après les deux ventes : chaussures équipées ×1, coffre ×1, gantelets absents et
  rachetables (`owned=false`, `affordable=true`), solde 30. Ledger : exactement deux `SALE`
  de 15. Une réouverture Metro a ensuite déclenché le scénario Santé E2E par défaut : trois
  crédits de séance supplémentaires, solde final 64 cohérent avec le ledger.
- Prix nul, reprise après redémarrage au prix original, doubles appels et refus de prix
  modifié couverts par tests déterministes. Pas de coupure réseau forcée sur appareil physique.

Les premières tentatives du flow ont nécessité d’utiliser les libellés français du catalogue
et, pour la continuation, de refermer une éventuelle récompense Santé E2E. Aucun changement de
règle produit n’a été nécessaire. La confirmation native est la présentation choisie.

- Continuation ledger iOS : deux lignes Vente +15 inspectées dans `artifacts/e2e/ledger-final-progress.png`; les trois crédits Santé restent distincts.
