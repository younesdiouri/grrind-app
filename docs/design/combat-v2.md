# Combat v2 — #164

## Spécification et plan

Le client consomme le contrat de grrind-back#270. Le serveur décide des actions, tentatives,
ticks, critique, garde, fatigue, résultat et récompenses. Le tableau conserve son ordre :
aucune alternance n’est supposée. Les ticks restent virtuels, jamais transformés en secondes
réelles. Les indices et ticks sont conservés dans les battements ; le tempo reste une décision
de présentation, comme avant v2.

1. Tirer OpenAPI main et régénérer les types, migrer catalogue/bonus/historique/spécimens.
2. Faire évoluer la timeline pure et prouver COMBO, limite et 10 000 tentatives.
3. Intégrer les quatre VFX et les poses auprès des combattants.
4. Recapturer les réponses HTTP, vérifier les scénarios rares déterministes puis le smoke réel.
5. Régénérer les previews RN, passer les barrières, pousser et ouvrir la PR.

## Mise en scène

COMBO annonce le prochain coup ; REJOUE apparaît pendant son élan, puis disparaît au contact.
Ils ne retirent aucun PV. Une esquive n’allume jamais la pose blessée ni une baisse de PV.
Critique et garde utilisent les booléens serveur. Les dégâts apparaissent auprès de la cible,
sans nombre ni phrase redondants au centre. Le bilan conserve les détails d’armure et de fatigue.

Les quatre PNG suivent leurs combattants : le critique sur la cible, l’esquive, le combo et la
relance sur leur acteur. Murīd dispose de trois poses de base et quatre variantes par direction ;
les modèles sans variante gardent leur pose de base. Les poses et effets utilisent les rampes
existantes, sans composant par événement ni boucle de setState. Les recherches de battement,
rampe et impact sont logarithmiques. La même horloge pilote sprite, HP et haptique.
Réduire les animations conserve les poses et images, retire transformations et vibrations.
Le saut pose toutes les rampes à l’arrivée ; une fin ATTACK_LIMIT n’affiche ni chute ni coup fatal.
Les compteurs de bilan viennent du serveur, distincts des sommes descriptives de dégâts.

Les duels utilisent une arène latérale en paysage plein écran, puis rétablissent le portrait.
Ālam utilise une carte surélevée et les miniatures de face. Le choix d’apparence est enregistré
par PATCH /me ; chaque combat lit son apparence figée par le serveur. La livraison des six poses
de base murid/v2 au backend attend leur validation utilisateur. Sources et prompts :
[combat-art.md](../../assets/images/combat-art.md).

## Assets générés

Sources : imagegen, 8 septembre 2026. Quatre PNG RGBA transparents dans
`assets/images/combat-effects/`, alpha vérifié et images inspectées. Aucun personnage ni texte
n’est intégré au bitmap. Les libellés ESQUIVE, CRITIQUE !, COMBO, REJOUE ! servent à l’accessibilité des images.

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
Après `npm run e2e:ios:dev`, jouer `npm run e2e:ios:flow -- .maestro/combat-v2.yaml`.
Ce parcours utilise une session sans activité sur le backend local et la fixture de butin.
La route E2E `frame` fige la même horloge au pic d’une rampe pour inspecter les huit variantes
sans hasard de capture ; le scénario long vérifie ×2 et Passer. Le bilan fixe vérifie le
défilement du butin et la sortie en portrait.
Le scénario long porte 10 000 tentatives. Les JSON de `fixtures/battle/` sont des captures HTTP
v2 réelles, séparées de ce banc synthétique.

Reste physique : qualité perceptive des haptics, lisibilité en mouvement, petit écran et grands
réglages de texte. Le full Release n’est pas requis et n’est jamais lancé sans demande explicite.

## Résultats du 8 septembre 2026

- TypeScript strict, lint, 512 tests : verts.
- `api:check` et `previews:check` : verts ; 28 previews dérivées des composants RN.
- Atelier Al-Kasal : vert, 97 s.
- Scénarios v2 : verts, 161 s après correction du saut ; huit effets/deux camps, chaîne
  animée, limite et 10 000 tentatives. Captures inspectées dans
  `artifacts/e2e/2026-09-08_134828/combat-v2/takeScreenshot/`.
- Smoke HTTP authentifié : vert, 289 s ; catalogue, victoire/bourse, historique, rejeu,
  synchronisation et inventaire. Captures inspectées dans
  `artifacts/e2e/2026-09-08_135131/ios-smoke/takeScreenshot/`.

L’itération visuelle a révélé un libellé de cible dans le halo critique, déplacé sous les dégâts,
puis un TextInput numérique qui interceptait le toucher : la couche présentative laisse
désormais tout toucher atteindre le Pressable racine. Aucun échec masqué. Aucun rebuild natif
ou full Release, aucune modification de dépôt backend, migration ou réinitialisation de base.

Contrôle ciblé critique et toucher : vert, 22 s. La capture Maestro immédiate montrait encore
le splash natif malgré les assertions ; la capture directe après sa disparition confirme
« TU ENCAISSES » et le VFX : `artifacts/e2e/critical-direct.png` (inspectée).

## Résultats du 5 octobre 2026 — #187 / #189

Typecheck, lint, 543 tests (2,6 s), previews:check et api:check passent. Les captures iOS Metro
ont été inspectées : sélection/PATCH du héros, combat réel et historique, PvP, duel latéral,
raid, repli des illustrations et huit variantes critique/esquive/combo/relance. ×2/Passer passe
sur le scénario long. Le butin fixe et sa sortie passent séparément après retrait d’un toucher
Maestro qui arrivait après la fin du combat court. Le flow combat-v2 rassemble ces vérifications.

Aucun e2e:ios:full exécuté. Un build Debug a été nécessaire pour le module d’orientation ;
les retouches JS suivantes réutilisent Metro. La mesure sur appareil physique reste ouverte.
