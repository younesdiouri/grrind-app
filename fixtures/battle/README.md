# Captures réelles de combat v2 — #164

Les quatre scénarios initiaux ont été recapturés le 8 septembre 2026 via `scripts/capture-battles.sh`
sur le backend local v2. Ce sont des réponses HTTP intactes, avec comptes E2E créés par API.
Aucun reset de base, migration ou changement backend n’a été effectué.

Les scénarios de `scripts/combat-presentation-server.mjs` restent **synthétiques**, réservés
au mode développement E2E. Ils couvrent les événements rares sans prétendre reproduire
l’équilibrage. Aucun calcul de mécanique ne fonctionne en production.

`duel-equipped.json` est une réponse HTTP intacte capturée sur le backend local le 17 octobre
2026 (#196 / grrind-back#296), avec le Bandeau trempé réellement équipé des deux côtés.
Le scénario `equipped-duel` la sert sans modifier ses équipements ; aucun jeton ni mot de
passe n’est stocké dans la fixture. Le flow `headwear-art.yaml` vérifie sa résolution automatique.
