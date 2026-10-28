# #320 — La semaine de la guilde

## Intention et périmètre

L’auteur veut retrouver l’énergie RPG de l’inventaire et de la boutique dans Guilde :
un accueil consacré aux séances de l’équipe et cinq sous-onglets persistants :
Semaine (défaut), Chat, Membres, Risālāt, Réglages.
Le 28 octobre 2026 il confirme le classement par nombre de séances validées dans la semaine.

- [x] Semaine : podium, classement complet, repère personnel, dates et total serveur.
- [x] Égalités respectées ; aucun podium artificiel avec des comptes à zéro.
- [x] Aperçu Risālāt compact ouvrant leur onglet complet, tour accessible.
- [x] Membres par niveau décroissant, progression XP, profil et croix d’exclusion nominative
      de 44 pt, confirmation conservée et réservée au fondateur.
- [x] Réglages : capacité, création, départ ; invitation/renommage/dissolution du fondateur.
- [x] Retirer le raccourci Ālam redondant ; conserver le brouillon en changeant de sous-onglet.
- [x] Push Risālāt/chat dirigés vers leur sous-onglet, paramètre consommé une fois.

Le back réalise [grrind-back#327](https://github.com/younesdiouri/grrind-back/issues/327)
dans son chat existant. Aucun score, rang ou calendrier métier recalculé par le client.
Seuls les types issus de son export officiel sont consommés. Aucun changement des règles
Risālāt, des rôles ou des récompenses, aucune dépendance ni modification native.

## Exécution et preuves

1. Navigation et liste des membres, tests du tri non mutatif et des droits rendus.
2. Accueil et intégration du contrat officiel, tests des rangs/valeurs serveur/états vides.
3. Previews RN Web, typecheck/lint/tests finaux et bundle Metro 8081.
   Un flow guilde ciblé si nécessaire pour le nouveau flux serveur, bundle stable pendant lui.

Les composants RN dans `src/components/` restent la source des previews, les requêtes
dans `src/features/community/`, les dimensions et couleurs dans `src/design/tokens.ts`.
Conserver les patterns existants (`StyleSheet.create`, types `components['schemas'][…]`,
`queryOrFailure`). Tests Node sur le code réel et les frontières HTTP.

Commandes : `rtk npm run typecheck`, `rtk npm run lint`, `rtk npm test`,
`rtk npm run previews`, puis `rtk npm run previews:check` après commit local ;
`GRRIND_API_FILE=<export-back> rtk npm run api:check` après génération officielle.

L’auteur juge le résultat sur son iPhone via le build installé. Réalisation locale,
sans nouveau build natif/EAS ni déploiement backend. Documentation Expo SDK 57 consultée
avant code : https://docs.expo.dev/versions/v57.0.0/.

## Résultat

Implémentation locale sur `codex/320-guild-weekly`. Backend #327 terminé dans son chat,
commit `c0103b7`, branche `codex/327-guild-weekly-leaderboard`, serveur localhost:8080.
Contrat officiel copié depuis `/Users/younesdiouri/Desktop/grrind/openapi.yaml`, types générés.
Le back annonce 1 507 tests et ses barrières QA/OpenAPI réussis.

Typecheck et lint : sortie 0 ; 616 tests client passent. 33 previews issues des composants RN.
Sous-onglets mesurés à 58 pt de haut ; exclusions à 44 × 44 pt, sans débordement dans
la preview de noms longs à la largeur utile d’un écran de 320 pt.
Bundle principal iOS Metro 8081 (`.expo/.virtual-metro-entry.bundle`) : HTTP 200,
12 373 078 octets ; présence de GuildWeeklyBoard et du décalage clavier confirmée.

Maestro `guild-weekly` passe en 1 min 32 s, rapport `artifacts/e2e/report.xml`, run
`2026-10-28_105940`. Chargement réel de la semaine vide, membres, Risālāt, brouillon conservé,
composer disponible avec clavier, gestion fondateur et départ vérifiés. Un seul compte jetable,
créé au premier essai ; reprises via `E2E_OFFLINE=1` pour conserver cette session et les vrais
appels API. Les échecs de préparation ont été diagnostiqués par leur capture : libellé de champ
ambigu, bilan de récompense en attente, `hideKeyboard` quittant le formulaire, puis permission
iOS « Refuser ». Le flow réutilise maintenant l’app ouverte et cible le champ par identifiant.
Les autres YAML ont seulement leurs destinations/sélecteurs mis à jour, sans parcours superposés.

Aucun rebuild natif, aucune modification d’Unity, aucun push ni déploiement. L’empreinte E2E
historique n’a pas été modifiée ; seul le binaire déjà installé a servi au test. Le rendu du
podium, les noms et le clavier du chat restent à juger par l’auteur sur son iPhone.
