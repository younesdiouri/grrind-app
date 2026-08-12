#!/usr/bin/env bash
#
# Capture des fixtures `RewardSummary` réelles depuis le back local.
#
# Ces fichiers ne sont pas écrits à la main : ce sont des réponses HTTP du vrai serveur,
# sous le vrai équilibrage `config/game/v1/`. Une fixture inventée prouverait que
# l'animation marche sur des chiffres qu'on a choisis pour qu'elle marche.
#
# Le serveur possède l'horloge et aucune route ne permet d'antidater — c'est l'invariant
# du projet. Pour obtenir une séance d'une heure sans attendre une heure, on recule la
# séance *déjà écrite* directement en base, exactement comme le fait `ageSession()` dans
# tests/Support/TrainingSessions.php côté back : on déplace le passé, on ne truque pas
# l'horloge.
#
# Prérequis : le back tourne (`cd ../grrind-back && make up`).
# Usage      : ./scripts/capture-fixtures.sh [chemin-vers-grrind-back]

set -euo pipefail

BACK_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../grrind" && pwd)}"
API="${API:-http://localhost:8080}"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/fixtures/reward-summary"

mkdir -p "$OUT"

sql() { docker compose -f "$BACK_DIR/compose.yaml" exec -T database psql -qtAX -U grrind -d grrind -c "$1" >/dev/null; }

# Recule une séance dans le passé, durée inchangée : sur une séance en cours ça allonge
# le temps écoulé, sur une séance close ça purge le cooldown.
age() { sql "UPDATE training_session SET started_at = started_at - ($2 * INTERVAL '1 second'), ended_at = ended_at - ($2 * INTERVAL '1 second') WHERE id = '$1'"; }

register() {
  curl -sf -X POST "$API/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"correct-horse-battery\",\"displayName\":\"$2\",\"timezone\":\"Europe/Paris\"}" \
    | jq -r '.tokens.accessToken'
}

start() {
  curl -sf -X POST "$API/api/training/sessions" \
    -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
    -d "{\"discipline\":\"$2\"}" | jq -r '.id'
}

complete() {
  curl -sf -X POST "$API/api/training/sessions/$2/complete" \
    -H "Authorization: Bearer $1" \
    -H "Idempotency-Key: $(uuidgen)" \
    -H 'Content-Type: application/json' -d '{}'
}

# Une séance de `$3` secondes sur la discipline `$2`, close et capturée si `$4` est donné.
run() {
  local token="$1" discipline="$2" seconds="$3" out="${4:-}"
  local id; id="$(start "$token" "$discipline")"
  age "$id" "$seconds"
  local body; body="$(complete "$token" "$id")"
  [ -n "$out" ] && printf '%s' "$body" | jq . > "$OUT/$out"
  echo "$id"
}

stamp="$(date +%s)"

# ── nominal : la toute première séance d'un compte ──────────────────────────────────
# Une heure de course, socle seul, aucun rabot — et `first_steps` qui tombe (session_count 1).
# Pas de niveau franchi : 90 XP, le niveau 2 est à 100. Le cas « premier jour ».
echo "→ nominal"
t1="$(register "nominal-$stamp@grrind.app" "Nominal")"
run "$t1" RUNNING 3600 nominal.json > /dev/null

# ── level-up : le cas complet, tout s'allume ────────────────────────────────────────
# Deux heures de natation sur un compte neuf : 60 min pleines, 30 à 60 %, 30 à 30 %,
# soit 87 min retenues à 100 XP/h = 145 XP. Le niveau 2 (100 XP) est franchi, un point
# de compétence tombe, et `first_steps` avec. Breakdown BASE + DIMINISHING.
echo "→ level-up"
t2="$(register "levelup-$stamp@grrind.app" "LevelUp")"
run "$t2" SWIMMING 7200 level-up.json > /dev/null

# ── plat : rien à célébrer, et l'animation doit rester digne ────────────────────────
# Le compte a déjà donné deux heures aujourd'hui ; la journée est au-delà de la dernière
# tranche, tout ce qui suit vaut ×0. Award ~0, aucun niveau, aucun titre.
echo "→ plat"
t3="$(register "plat-$stamp@grrind.app" "Plat")"
first="$(run "$t3" RUNNING 7200)"          # 2 h : la journée est consommée
age "$first" 1200                          # purge le cooldown (900 s)
run "$t3" RUNNING 1800 plat.json > /dev/null

echo
echo "Fixtures écrites dans fixtures/reward-summary/ :"
for f in "$OUT"/*.json; do
  printf '  %-16s awarded=%-5s reached=%-10s titres=%s\n' \
    "$(basename "$f")" \
    "$(jq -r '.xp.awarded' "$f")" \
    "$(jq -c '.level.reached' "$f")" \
    "$(jq -r '[.titlesUnlocked[].id] | join(",") // "—"' "$f")"
done
