#!/usr/bin/env bash
#
# Capture des fixtures `SyncSummary` réelles depuis le back local.
#
# Ces fichiers ne sont pas écrits à la main : ce sont des réponses HTTP du vrai serveur, sous
# le vrai équilibrage `config/game/v1/`. Une fixture inventée prouverait que l'animation
# marche sur des chiffres qu'on a choisis pour qu'elle marche.
#
# ————— Ce que le virage santé a simplifié ————————————————————————————————————————————
#
# La version précédente de ce script reculait des séances **en base**, par psql, parce que le
# serveur possédait l'horloge et qu'aucune route ne permettait d'antidater. Ce n'est plus le
# cas : les bornes d'un workout viennent du fournisseur, donc du client, donc d'ici. Le
# script n'a plus besoin ni de Docker ni d'un accès à la base — juste de l'API.
#
# Ce qui n'a pas changé : le serveur **arbitre** toujours. Il écrête la durée au-delà de
# quatre heures, il applique les rendements décroissants sur la charge du jour, et il refuse
# ce qui sort de la fenêtre de trente jours. Les fixtures portent donc ce que le jeu produit
# vraiment, y compris ce qui dérange.
#
# Prérequis : le back tourne (`cd ../grrind && make up`).
# Usage      : ./scripts/capture-fixtures.sh

set -euo pipefail

API="${API:-http://localhost:8080}"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/fixtures/sync-summary"

mkdir -p "$OUT"

# Un instant, en ISO 8601 UTC, à N secondes dans le passé. macOS veut `-r`, GNU veut `-d @`.
iso() {
  local at=$(( $(date +%s) - $1 ))
  date -u -r "$at" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "@$at" +%Y-%m-%dT%H:%M:%SZ
}

DAY=86400

register() {
  curl -sf -X POST "$API/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"correct-horse-battery\",\"displayName\":\"$2\",\"timezone\":\"Europe/Paris\"}" \
    | jq -r '.tokens.accessToken'
}

# Un workout candidat. `workout <id> <type> <début il y a N s> <durée s> [distance m] [dénivelé m]`
workout() {
  jq -nc \
    --arg id "$1" --arg type "$2" \
    --arg start "$(iso "$3")" --arg end "$(iso $(( $3 - $4 )))" \
    --argjson distance "${5:-null}" --argjson elevation "${6:-null}" \
    '{
      externalId: $id, source: "APPLE_HEALTH", activityType: $type,
      startedAt: $start, endedAt: $end,
      distanceMeters: $distance, calories: null,
      elevationGainMeters: $elevation, averageHeartRate: null
    }'
}

# Envoie un lot et écrit la réponse. `import <jeton> <fichier|-> <workout json...>`
import() {
  local token="$1" out="$2"; shift 2
  local body
  body="$(printf '%s\n' "$@" | jq -sc '{workouts: .}')"

  local reply
  reply="$(curl -sf -X POST "$API/api/workouts/import" \
    -H "Authorization: Bearer $token" \
    -H "Idempotency-Key: $(uuidgen)" \
    -H 'Content-Type: application/json' \
    -d "$body")"

  [ "$out" = "-" ] || printf '%s' "$reply" | jq . > "$OUT/$out"
  printf '%s' "$reply"
}

stamp="$(date +%s)"

# ── un-workout : le cas le plus simple, et il n'est pas maigre ───────────────────────
# Une heure dix de course avec 12 km sur un compte neuf. Le socle, le rabot des rendements
# décroissants au-delà de soixante minutes, la distance, un niveau franchi et `first_steps`
# qui tombe. C'est le `SyncSummary` minimal : un seul `RewardSummary`, mais complet.
echo "→ un-workout"
t1="$(register "un-$stamp@grrind.app" "Un")"
import "$t1" un-workout.json \
  "$(workout "un-1" running $(( 2 * DAY )) 4200 12000)" > /dev/null

# ── trois-workouts : deux niveaux franchis, la barre traverse le lot ─────────────────
# Trois jours distincts, parce que c'est le cas que le produit vise : quelqu'un qui rentre
# de déplacement et dont la montre a trois séances en attente. Des jours distincts évitent
# aussi que les rendements décroissants du jour écrasent les deuxième et troisième — ici
# chacun repart d'une charge quotidienne vierge.
#
# C'est *le* cas qui justifie que le back serve le palier de départ (grrind-back#79) : la
# barre part du bon endroit pour chacun des trois, et l'enchaînement est continu sans un
# seul recalcul côté client.
echo "→ trois-workouts"
t2="$(register "trois-$stamp@grrind.app" "Trois")"
import "$t2" trois-workouts.json \
  "$(workout "trois-1" running   $(( 5 * DAY )) 3600 10000)" \
  "$(workout "trois-2" cycling   $(( 3 * DAY )) 3600 30000)" \
  "$(workout "trois-3" traditionalStrengthTraining $(( 1 * DAY )) 2700)" > /dev/null

# ── quinze-workouts : le retour de vacances ──────────────────────────────────────────
# Quinze séances sur quinze jours. C'est la fixture qui décide de la mise en scène : tout
# jouer en détail prend plus d'une minute, que personne ne regardera. Le client en joue
# quelques-unes puis condense — et c'est ici que ça se règle, sur de vrais chiffres.
echo "→ quinze-workouts"
t3="$(register "quinze-$stamp@grrind.app" "Quinze")"
batch=()
for i in $(seq 1 15); do
  case $(( i % 5 )) in
    0) batch+=("$(workout "quinze-$i" hiking   $(( i * DAY )) 5400 9000 400)") ;;
    1) batch+=("$(workout "quinze-$i" running  $(( i * DAY )) 2700 7000)") ;;
    2) batch+=("$(workout "quinze-$i" cycling  $(( i * DAY )) 4500 35000)") ;;
    3) batch+=("$(workout "quinze-$i" traditionalStrengthTraining $(( i * DAY )) 3000)") ;;
    4) batch+=("$(workout "quinze-$i" yoga     $(( i * DAY )) 1800)") ;;
  esac
done
import "$t3" quinze-workouts.json "${batch[@]}" > /dev/null

# ── tout-ecarte : rien n'est crédité, et l'écran doit rester digne ───────────────────
# Le cas qu'on oublie et celui qui se voit : l'utilisateur rouvre l'app pour la troisième
# fois de la journée, sa montre n'a rien de neuf. `imported` est vide, `totals` vaut `null`
# — le back refuse d'écrire « niveau 0 → 0 » à un joueur de niveau 12 — et il n'y a rien à
# animer.
#
# Le lot n'est pas fait que de doublons : quatre des cinq raisons de refus y sont, parce que
# l'écran doit pouvoir dire *pourquoi* chacune est écartée. « Le curling n'est pas encore un
# sport chez nous » est une phrase ; « 4 séances ignorées » n'en est pas une.
#
# `OVERLAPS` manque, et c'est structurel : pour l'obtenir il faut deux séances qui se
# chevauchent, dont l'une est créditée — le lot ne serait plus entièrement écarté.
echo "→ tout-ecarte"
import "$t2" tout-ecarte.json \
  "$(workout "trois-1" running   $(( 5 * DAY )) 3600 10000)" \
  "$(workout "trois-2" cycling   $(( 3 * DAY )) 3600 30000)" \
  "$(workout "ecarte-curling" curling $(( 2 * DAY )) 3600)" \
  "$(workout "ecarte-court"   running $(( 2 * DAY )) 120)" \
  "$(workout "ecarte-vieux"   running $(( 60 * DAY )) 3600 8000)" > /dev/null

echo
echo "Fixtures écrites dans $OUT :"
for f in "$OUT"/*.json; do
  printf '  %-24s %s\n' "$(basename "$f")" \
    "$(jq -r '"\(.imported | length) crédité(s) · \(.skipped | length) écarté(s) · \(.totals.xpAwarded // 0) XP"' "$f")"
done
