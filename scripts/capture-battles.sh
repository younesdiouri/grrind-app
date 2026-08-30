#!/usr/bin/env bash
#
# Capture des fixtures `Battle` réelles depuis le back local.
#
# Même règle que `capture-fixtures.sh`, et pour la même raison : ces fichiers sont des réponses
# HTTP du vrai serveur, sous le vrai équilibrage `config/game/v1/`. Une timeline écrite à la
# main prouverait que l'animation marche sur des coups qu'on a choisis pour qu'elle marche.
#
# ————— Ce qu'un combat a de particulier : il est tiré au sort ————————————————————————
#
# Un `SyncSummary` est déterministe — mêmes séances, même XP. Un combat ne l'est pas : la
# graine est tirée côté serveur à chaque appel, et deux combats contre le même adversaire ne
# rendent ni la même issue ni la même longueur.
#
# On ne peut donc pas capturer « le » combat qu'on veut du premier coup. Le script rejoue
# jusqu'à ce que la réponse porte **la forme** que la fixture doit prouver — une victoire, une
# défaite, au moins une esquive — et abandonne au bout de quelques essais plutôt que de tourner
# indéfiniment. Ce qu'il ne fait jamais, c'est retoucher ce que le serveur a rendu.
#
# ————— Le compte de niveau 19 ————————————————————————————————————————————————————————
#
# Les boss demandent le niveau 10, et un compte neuf est au niveau 1. Il faut donc lui faire
# gagner de l'XP avant de pouvoir en affronter un, et le seul moyen est celui du jeu : importer
# des séances. Vingt-neuf jours de course longue amènent au niveau 19, ce qui ouvre
# `IRON_JACKAL` et `DUNE_SOVEREIGN`.
#
# Prérequis : le back tourne (`cd ../grrind && make up && make migrate`).
# Usage      : ./scripts/capture-battles.sh

set -euo pipefail

API="${API:-http://localhost:8080}"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/fixtures/battle"

mkdir -p "$OUT"

DAY=86400
stamp="$(date +%s)"

# Un instant, en ISO 8601 UTC, à N secondes dans le passé. macOS veut `-r`, GNU veut `-d @`.
iso() {
  local at=$(( $(date +%s) - $1 ))
  date -u -r "$at" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "@$at" +%Y-%m-%dT%H:%M:%SZ
}

register() {
  curl -sf -X POST "$API/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"correct-horse-battery\",\"displayName\":\"$2\",\"timezone\":\"Europe/Paris\"}" \
    | jq -r '.tokens.accessToken'
}

# Monte un compte au niveau 19 : 29 jours de course de quatre heures, 30 km, 800 m de dénivelé.
# La fenêtre d'antériorité est de trente jours côté serveur, d'où le plafond à 29.
level_up() {
  local token="$1" workouts=()

  for i in $(seq 1 29); do
    local start=$(( i * DAY ))
    workouts+=("$(jq -nc \
      --arg id "lvl-$stamp-$i" --arg s "$(iso "$start")" --arg e "$(iso $(( start - 14400 )))" \
      '{
        externalId: $id, source: "APPLE_HEALTH", activityType: "running",
        startedAt: $s, endedAt: $e,
        distanceMeters: 30000, calories: null,
        elevationGainMeters: 800, averageHeartRate: null
      }')")
  done

  curl -sf -X POST "$API/api/workouts/import" \
    -H "Authorization: Bearer $token" \
    -H "Idempotency-Key: $(uuidgen)" \
    -H 'Content-Type: application/json' \
    -d "$(printf '%s\n' "${workouts[@]}" | jq -sc '{workouts: .}')" \
    | jq -r '.totals.levelAfter'
}

# Livre un combat et écrit la réponse, en rejouant tant que la forme voulue n'est pas sortie.
#
#   fight <jeton> <clé d'adversaire|-> <prédicat jq> <fichier>
#
# `Accept-Language: fr` parce que le nom de l'adversaire arrive traduit et que la fixture doit
# porter ce que l'app recevra — le client pose le même en-tête depuis #112.
fight() {
  local token="$1" enemy="$2" predicate="$3" out="$4"
  local body='{}' reply

  [ "$enemy" = "-" ] || body="$(jq -nc --arg e "$enemy" '{enemy: $e}')"

  for attempt in $(seq 1 40); do
    reply="$(curl -sf -X POST "$API/api/battles" \
      -H "Authorization: Bearer $token" \
      -H "Idempotency-Key: $(uuidgen)" \
      -H 'Accept-Language: fr' \
      -H 'Content-Type: application/json' \
      -d "$body")"

    if printf '%s' "$reply" | jq -e "$predicate" > /dev/null; then
      printf '%s' "$reply" | jq . > "$OUT/$out"
      echo "  $out — $(printf '%s' "$reply" | jq -r '"\(.result), \(.turns) tours, \(.events|length) événements"') (essai $attempt)"
      return 0
    fi
  done

  echo "  ✗ $out — aucune des 40 tentatives n'a rendu la forme voulue ($predicate)" >&2
  return 1
}

# ── victoire : le cas le plus simple, sur un compte neuf ─────────────────────────────
# Sans corps, le serveur choisit au niveau du joueur : `SAND_JACKAL`. Aucun des deux camps
# n'a de mitigation, ce qui donne une timeline d'attaques nues — c'est la fixture qui prouve
# que le socle de l'animation tient avant toute forme rare.
echo "→ victoire"
neuf="$(register "battle-neuf-$stamp@grrind.app" "Neuf")"
fight "$neuf" - '.result == "VICTORY"' victoire.json

# ── victoire-avec-loot : une victoire qui rapporte (#124) ────────────────────────────
# La bande de pièces de `SAND_JACKAL` tombe à chaque victoire — `victoire.json` le prouve
# déjà — mais son tirage d'objet n'a que vingt pour cent de chances de sortir. Même boucle
# que `fight`, sur un compte neuf distinct pour ne pas dépendre de l'ordre des essais
# précédents, jusqu'à ce que `rewards.loot` porte au moins un objet.
echo "→ victoire-avec-loot"
comble="$(register "battle-comble-$stamp@grrind.app" "Comblé")"
fight "$comble" - '.result == "VICTORY" and (.rewards.loot | length) > 0' victoire-avec-loot.json

# ── defaite-boss : les cinq formes d'un coup ─────────────────────────────────────────
# Un compte monté au niveau 19 contre `DUNE_SOVEREIGN` (700 PV, 40 de dégâts). Il perd, et la
# timeline porte au passage une esquive et un tour supplémentaire : c'est la seule fixture où
# les cinq formes d'événement se rencontrent.
echo "→ defaite-boss"
monte="$(register "battle-monte-$stamp@grrind.app" "Monté")"
echo "  niveau atteint : $(level_up "$monte")"
fight "$monte" DUNE_SOVEREIGN \
  '.result == "DEFEAT" and ([.events[] | select(.type == "DODGE")] | length) > 0' \
  defaite-boss.json

# ── combat-long : celui qui met le tempo sous tension ────────────────────────────────
# Le même compte contre `IRON_JACKAL`. Une trentaine de tours, ce qui est le plus long que
# l'équilibrage actuel produise — voir le commentaire de `fixtures.ts` sur ce que cette
# fixture ne prouve *pas*.
echo "→ combat-long"
fight "$monte" IRON_JACKAL '.turns >= 25' combat-long.json

echo "✓ fixtures de combat écrites dans $OUT"
