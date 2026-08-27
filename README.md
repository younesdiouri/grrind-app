# GRRIND — Client

Client **React Native (Expo)** de GRRIND, l'app qui transforme le sport en RPG. L'API vit dans
[`younesdiouri/grrind-back`](https://github.com/younesdiouri/grrind-back) et le contrat entre les
deux est `openapi.yaml`, rien d'autre.

## Démarrer

```bash
npm install
cp .env.example .env.local                 # puis y mettre l'IP LAN du Mac
npm run api:pull && npm run api:generate   # types depuis le contrat
npm run ios                                # dev build sur appareil physique
```

Le premier `npm run ios` déclenche un `prebuild` et une compilation Xcode. Il faut donc Xcode
sélectionné (`sudo xcode-select -s /Applications/Xcode.app`) et un iPhone connecté et approuvé.
Un compte développeur gratuit suffit — le profil dure sept jours.

**Pas de Docker ici**, contrairement au back : Expo pilote Xcode et un appareil physique, qu'un
conteneur ne peut pas atteindre. C'est le seul point où les deux dépôts divergent sur la méthode.

## Deux apps sur le même téléphone

Le build de développement et celui de TestFlight ont des **identifiants distincts**, donc ils
cohabitent : chacun a ses propres autorisations Santé et notifications, son propre Keychain, son
propre jeton de push. Plus besoin de supprimer l'un pour installer l'autre — c'est ce cycle qui
rendait les tests inexploitables, puisqu'une app fraîchement réinstallée repart de zéro sur tout
ce qu'iOS lui attache.

|                   | dev                 | TestFlight / App Store |
| ----------------- | ------------------- | ---------------------- |
| Identifiant       | `app.grrind.dev`    | `app.grrind`           |
| Nom sur l'écran   | GRRIND dev          | grrind-app             |
| Icône             | ambre               | bleue                  |
| Schéma d'URL      | `grrindapp-dev://`  | `grrindapp://`         |

Une seule variable décide, `APP_VARIANT=development` : `app.config.ts` la lit et n'écrase que ce
qui change ; `app.json` reste la base statique. Elle est posée par le profil `development`
d'`eas.json` et par les scripts `npm run ios` / `npm run android` — **il n'y a rien à exporter à
la main**.

```bash
npm run ios                                        # → app.grrind.dev
npx expo config --type public --json | grep bundle # vérifier laquelle on construit
```

## Le contrat ne s'écrit pas à la main

`api/openapi.yaml` est une **copie** du fichier généré par le back. On ne l'édite jamais ici :
on le tire, on régénère les types, et la CI échoue si le résultat dérive — symétrique du
garde-fou qui protège le fichier côté serveur.

```bash
npm run api:pull       # récupère openapi.yaml depuis grrind-back
npm run api:generate   # openapi-typescript → src/api/schema.d.ts
npm run api:check      # les deux, et échoue sur un diff
```

Aucun DTO écrit à la main, aucun enum recopié.

## Le refresh sérialisé, et pourquoi il a des tests

Le refresh token est à usage unique, rotatif et groupé par famille — une famille est un
appareil. Rejouer un jeton déjà consommé révoque **toute la famille** : le back ne peut pas
distinguer le voleur du vrai client qui a été doublé, donc il coupe. Deux requêtes qui expirent
en même temps et rafraîchissent chacune de leur côté déconnectent donc l'appareil.

C'est le seul endroit du client où le bon et le mauvais comportement **affichent le même
écran**. La différence ne se manifeste qu'à l'ouverture suivante, par une déconnexion que
personne ne saura relier à ce moment-là. D'où trois filets, du plus proche du code au plus
proche du réel :

```bash
npm test        # `node --test`, sans Expo ni appareil — les deux modules purs
```

- `src/features/auth/refreshCoordinator.ts` — la promesse unique et partagée, plus la règle
  qui distingue « ma session est morte » de « j'étais en vol pendant qu'on renouvelait ».
- `src/api/authMiddleware.ts` — le `Bearer`, et **un seul** rejeu par requête.
- L'écran d'accueil porte un banc : il périme le JWT et lance deux requêtes simultanées sur le
  vrai back. Le verdict attendu est `2/2 réponses · 1 rafraîchissement`.

## Le design system n'a qu'un sens

Les composants React Native sont la source de vérité ; les previews HTML en sont **dérivées**
via `react-native-web`. L'inverse coûterait une traduction CSS → RN sur chaque composant, à vie :
React Native n'a ni cascade, ni `flexDirection: row` par défaut, ni ombre portable.

```bash
npm run previews         # src/design/previews.tsx → previews/*.html
npm run previews:check   # régénère, et échoue sur un diff — le même filet que le contrat
```

Chaque fichier s'ouvre sur `<!-- @dsCard group="…" -->`, le marqueur qui range la carte dans le
volet Design System à la synchronisation. Les tokens — couleurs, typographie, espacements,
**durées et courbes** — vivent dans `src/design/tokens.ts` : aucune valeur en dur dans un
composant. Les durées sortent du spike, mesurées sur un iPhone physique.

## Le spike

`fixtures/reward-summary/` contient trois **réponses réelles** du back, capturées par
`scripts/capture-fixtures.sh` sous l'équilibrage `config/game/v1/`. Le back doit tourner :

```bash
cd ../grrind && make up
cd ../grrind-app && ./scripts/capture-fixtures.sh
```

L'écran d'accueil les joue. Le cas `plat` — 0 XP accordé, `BASE 45` puis `DIMINISHING −45` — est
celui qui décide : une mise en scène qui ne tient que sur le cas joyeux ne tient pas.

## Ce qu'il faut lire avant de coder

- `CLAUDE.md` — les trois invariants du client, et pourquoi les ignorer coûte une déconnexion ou
  une XP doublée.
- `AGENTS.md` — Expo a changé ; les docs de mémoire sont fausses d'une majeure à l'autre.
- `src/features/reward/timeline.ts` — la mise en scène du `RewardSummary`, en fonction pure.

## Suivi

https://github.com/users/younesdiouri/projects/1 — tableau commun aux deux dépôts, avec une
colonne « Repository » et un champ « Lot » qui traverse. Les jalons et labels, eux, sont par
dépôt. Aucun commit sans numéro de ticket.
