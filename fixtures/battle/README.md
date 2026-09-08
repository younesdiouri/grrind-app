# Captures réelles de combat v2 — #164

Les quatre JSON ont été recapturés le 8 septembre 2026 via `scripts/capture-battles.sh`
sur le backend local v2. Ce sont des réponses HTTP intactes, avec comptes E2E créés par API.
Aucun reset de base, migration ou changement backend n’a été effectué.

Les scénarios de `scripts/combat-presentation-server.mjs` restent **synthétiques**, réservés
au mode développement E2E. Ils couvrent les événements rares sans prétendre reproduire
l’équilibrage. Aucun calcul de mécanique ne fonctionne en production.
