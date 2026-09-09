# Inventaire et profils — #168

## Spécification
L’onglet Inventaire remplace Santé au même emplacement. Santé reste accessible dans une section
Réglages et conserve son parcours de permissions, synchronisation et résultats. L’inventaire
conserve toutes ses mutations, la bourse et la boutique. Les statistiques s’affichent par ligne,
avec icônes, valeurs effectives et bonus d’équipement fournis par le serveur. Les profils publics
partagent ces lignes et les équipements/objets en lecture seule, sans monnaie ni prix privés.
Les cercles existants restent présents. Le catalogue montre les illustrations ou leur placeholder,
pas les statistiques des adversaires; les PV et événements restent visibles durant le combat.

## Plan et tâches
- [x] Contrat backend : statistiques résolues et inventaire public protégé par le voter existant.
- [x] Génération du contrat depuis la branche backend, sans édition manuelle.
- [x] Navigation Inventaire/Santé, présentation commune, profils, illustrations des adversaires.
- [x] Tests et previews RN, QA iOS Metro avant/après et captures inspectées.
- [x] Barrières finales, commits liés, branches poussées et PRs ouvertes, sans fusion.

## Décisions
L’autorisation backend a été donnée explicitement par l’utilisateur. Aucun reset ou migration.
Le profil détaillé reçoit sa propre réponse pour éviter de charger les sacs dans les listes de guilde.
La capture Dofus inspire uniquement la structure de lignes et les icônes, dans le style GRRIND.
La QA Release complète n’est pas demandée; la validation mobile utilise Metro uniquement.

## Documentation consultée
- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/versions/v57.0.0/sdk/router/
- https://docs.expo.dev/versions/v57.0.0/sdk/image/

## Preuves de validation
- Typecheck, lint, 528 tests/125 suites, previews et contrat généré vérifiés.
- Smoke iOS Metro : `artifacts/e2e/2026-09-09_105826/ios-smoke/`.
- Profil/bonus équipement : `artifacts/e2e/2026-09-09_110414/inventory-profile/`.
- Vente/coffre/icônes : `artifacts/e2e/2026-09-09_110804/inventory-actions/`.
- Combat final : `artifacts/e2e/2026-09-09_111119/inventory-combat/`.
- Fusionner/déployer grrind-back #274 avant la PR frontend. Permissions HealthKit réelles à vérifier sur appareil physique.
