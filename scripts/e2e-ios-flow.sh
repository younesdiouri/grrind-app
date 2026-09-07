#!/bin/sh

# Rejoue Maestro contre le development build et le Metro déjà préparés. Aucun prebuild, build,
# effacement ou redémarrage du Simulator n'a lieu ici.

set -eu

. "$(dirname "$0")/e2e-ios-common.sh"

METRO_PORT="${E2E_METRO_PORT:-8082}"
DEV_STATE_DIR="artifacts/e2e/dev"
METRO_SETTINGS_FILE="${DEV_STATE_DIR}/metro-settings"
METRO_HOST_FILE="${DEV_STATE_DIR}/metro-host"
FLOW_PATH="${1:-.maestro/ios-smoke.yaml}"
STARTED_AT="$(date +%s)"
EXPECTED_SETTINGS="port=${METRO_PORT};api=${E2E_API_URL_VALUE}"

e2e_require_tools
# Les ateliers de présentation peuvent tourner sans compte ni serveur. Ce mode est explicite
# pour ne jamais faire passer le smoke authentifié avec un backend manquant.
if [ "${E2E_OFFLINE:-0}" != "1" ]; then
  e2e_require_backend
fi
e2e_find_or_create_simulator
e2e_boot_simulator
e2e_require_installed_app

if ! curl --connect-timeout 1 --max-time 2 -fsS \
  "http://localhost:${METRO_PORT}/status" 2>/dev/null |
  grep -q 'packager-status:running'; then
  echo "Metro E2E n'est pas prêt. Lance d'abord: npm run e2e:ios:dev" >&2
  exit 1
fi

if [ ! -f "$METRO_SETTINGS_FILE" ] ||
  [ "$(sed -n '1p' "$METRO_SETTINGS_FILE")" != "$EXPECTED_SETTINGS" ] ||
  [ ! -s "$METRO_HOST_FILE" ]; then
  echo "Le Metro du port ${METRO_PORT} n'a pas la configuration E2E attendue." >&2
  echo "Relance: npm run e2e:ios:dev" >&2
  exit 1
fi

METRO_HOST="$(sed -n '1p' "$METRO_HOST_FILE")"

if [ "${E2E_OFFLINE:-0}" = "1" ]; then
  E2E_EMPTY_EMAIL=""
  E2E_MULTIPLE_EMAIL=""
else
  e2e_register_accounts
  e2e_reset_state
fi

DEV_CLIENT_URL="exp+grrind-app://expo-development-client/?url=http%3A%2F%2F${METRO_HOST}%3A${METRO_PORT}"
xcrun simctl openurl "$E2E_SIMULATOR_UDID" "$DEV_CLIENT_URL"

e2e_run_flow "$FLOW_PATH"

elapsed=$(( $(date +%s) - STARTED_AT ))
echo "Flow iOS E2E dev terminé en ${elapsed}s (aucun build natif)."
