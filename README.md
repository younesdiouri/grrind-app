# GRRIND — Client

Client **React Native (Expo)** de GRRIND, l'app qui transforme le sport en RPG. L'API vit dans
[`younesdiouri/grrind-back`](https://github.com/younesdiouri/grrind-back) et le contrat entre les
deux est `openapi.yaml`, rien d'autre.

## Démarrer

```bash
npm install
npm run api:pull && npm run api:generate   # types depuis le contrat
npm run ios                                # dev build sur appareil physique
```

Le premier `npm run ios` déclenche un `prebuild` et une compilation Xcode. Il faut donc Xcode
sélectionné (`sudo xcode-select -s /Applications/Xcode.app`) et un iPhone connecté et approuvé.
Un compte développeur gratuit suffit — le profil dure sept jours.

**Pas de Docker ici**, contrairement au back : Expo pilote Xcode et un appareil physique, qu'un
conteneur ne peut pas atteindre. C'est le seul point où les deux dépôts divergent sur la méthode.

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
