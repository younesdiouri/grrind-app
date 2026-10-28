# #320 — La semaine de la guilde

## Intention et périmètre

L’auteur veut retrouver l’énergie RPG de l’inventaire et de la boutique dans Guilde :
un accueil consacré aux séances de l’équipe et cinq sous-onglets persistants :
Semaine (défaut), Chat, Membres, Risālāt, Réglages.
Le 28 octobre 2026 il confirme le classement par nombre de séances validées dans la semaine.

- [ ] Semaine : podium, classement complet, repère personnel, dates et total serveur.
- [ ] Égalités respectées ; aucun podium artificiel avec des comptes à zéro.
- [ ] Aperçu Risālāt compact ouvrant leur onglet complet, tour accessible.
- [ ] Membres par niveau décroissant, progression XP, profil et croix d’exclusion nominative
      de 44 pt, confirmation conservée et réservée au fondateur.
- [ ] Réglages : capacité, création, départ ; invitation/renommage/dissolution du fondateur.
- [ ] Retirer le raccourci Ālam redondant ; conserver le brouillon en changeant de sous-onglet.
- [ ] Push Risālāt/chat dirigés vers leur sous-onglet, paramètre consommé une fois.

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

À compléter après vérification.
