# Combat v2 — #164

## Spécification et plan

Le client consomme le contrat de grrind-back#270. Le serveur décide des actions, tentatives,
ticks, critique, garde, fatigue, résultat et récompenses. Le tableau conserve son ordre :
aucune alternance n’est supposée. Les ticks restent virtuels, jamais transformés en secondes
réelles. Les indices et ticks sont conservés dans les battements ; le tempo reste une décision
de présentation, comme avant v2.

1. Tirer OpenAPI main et régénérer les types, migrer catalogue/bonus/historique/spécimens.
2. Faire évoluer la timeline pure et prouver COMBO, limite et 10 000 tentatives.
3. Intégrer les quatre VFX et les textes natifs dans l’espace sous le sprite.
4. Recapturer les réponses HTTP, vérifier les scénarios rares déterministes puis le smoke réel.
5. Régénérer les previews RN, passer les barrières, pousser et ouvrir la PR.

## Mise en scène

COMBO annonce le prochain coup ; REJOUE apparaît pendant son élan, puis disparaît au contact.
Ils ne retirent aucun PV. Une esquive n’allume jamais la pose blessée ni une baisse de PV.
Critique et garde utilisent les booléens serveur ; les dégâts, la réduction de garde et la
puissance après fatigue sont affichés sans rejouer les formules. Le nombre de dégâts est
celui reçu par la cible : « TU ENCAISSES » ou « [ADVERSAIRE] ENCAISSE » le précise sous le
nombre, hors du cœur lumineux. La couleur continue d’identifier la barre de PV ciblée.

Les PNG restent dans la zone d’annonce, les trois poses du personnage ne changent pas.
Toutes les couches sont fixes : aucun composant par événement, aucune boucle de setState.
Les recherches de battement, rampe et impact sont logarithmiques. La même horloge pilote
sprite, HP, texte et haptique. Réduire les animations retire transformations et vibrations.
Le saut pose toutes les rampes à l’arrivée ; une fin ATTACK_LIMIT n’affiche ni chute ni coup fatal.
Les compteurs de bilan viennent du serveur, distincts des sommes descriptives de dégâts.

## Assets générés

Sources : imagegen, 8 septembre 2026. Quatre PNG RGBA transparents dans
`assets/images/combat-effects/`, alpha vérifié et images inspectées. Aucun personnage ni texte
n’est intégré au bitmap. Les textes ESQUIVE, CRITIQUE !, COMBO, REJOUE ! sont natifs.

Direction commune des prompts : effet fantasy peint MMORPG dans l’esprit Flyff, énergique,
haute lisibilité, lumière et éclats, transparent, aucun décor, aucun personnage, aucun texte.
- dodge : deux traînées cyan courbes, centre ouvert.
- critical : explosion or/ambre.
- combo : trois slashs violet/magenta.
- replay : deux traînées mint/turquoise, pointes or.

## Sources versionnées consultées

- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/
- https://docs.expo.dev/versions/v57.0.0/sdk/image/
- https://docs.expo.dev/versions/v57.0.0/sdk/haptics/

## QA

`node scripts/combat-presentation-server.mjs` sert les scénarios synthétiques.
Après `npm run e2e:ios:dev`, jouer `E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/combat-v2.yaml`.
La route E2E `frame` fige la même horloge au pic d’une rampe pour inspecter les huit variantes
sans hasard de capture ; les scénarios animés suivants vérifient l’enchaînement et le saut.
Le scénario long porte 10 000 tentatives. Les JSON de `fixtures/battle/` sont des captures HTTP
v2 réelles, séparées de ce banc synthétique.

Reste physique : qualité perceptive des haptics, lisibilité en mouvement, petit écran et grands
réglages de texte. Le full Release n’est pas requis et n’est jamais lancé sans demande explicite.
