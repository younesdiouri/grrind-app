#!/bin/sh

# Prépare le development build E2E et Metro sans effacer le Simulator. Un build natif n'est
# exécuté qu'à la première préparation, lorsqu'un intrant natif a changé, ou avec
# `E2E_FORCE_BUILD=1`.

set -eu

. "$(dirname "$0")/e2e-ios-common.sh"

METRO_PORT="${E2E_METRO_PORT:-8082}"
DEV_STATE_DIR="artifacts/e2e/dev"
NATIVE_FINGERPRINT_FILE="${DEV_STATE_DIR}/native-fingerprint"
METRO_SETTINGS_FILE="${DEV_STATE_DIR}/metro-settings"
METRO_HOST_FILE="${DEV_STATE_DIR}/metro-host"
METRO_LOG_FILE="${DEV_STATE_DIR}/metro.log"
METRO_PID_FILE="${DEV_STATE_DIR}/metro.pid"
STARTED_AT="$(date +%s)"
E2E_METRO_STARTED=0

native_fingerprint() {
  {
    shasum app.json app.config.ts package.json package-lock.json
    find modules/grrind-health \
      \( -path '*/ios/*' -o -name 'expo-module.config.json' \) \
      -type f -exec shasum {} \; | sort
  } | shasum | awk '{ print $1 }'
}

metro_is_ready() {
  curl --connect-timeout 1 --max-time 2 -fsS \
    "http://localhost:${METRO_PORT}/status" 2>/dev/null |
    grep -q 'packager-status:running'
}

ensure_metro() {
  expected_settings="port=${METRO_PORT};api=${E2E_API_URL_VALUE}"

  if metro_is_ready; then
    if [ ! -f "$METRO_SETTINGS_FILE" ] ||
      [ "$(sed -n '1p' "$METRO_SETTINGS_FILE")" != "$expected_settings" ] ||
      [ ! -s "$METRO_HOST_FILE" ]; then
      echo "Le port Metro ${METRO_PORT} est déjà occupé par un serveur non reconnu." >&2
      echo "Choisis un autre port avec E2E_METRO_PORT ou arrête ce serveur." >&2
      exit 1
    fi
    E2E_METRO_HOST="$(sed -n '1p' "$METRO_HOST_FILE")"
    echo "Metro E2E déjà prêt sur le port ${METRO_PORT}."
    return
  fi

  mkdir -p "$DEV_STATE_DIR"
  : >"$METRO_LOG_FILE"
  env \
    APP_VARIANT=e2e \
    EXPO_PUBLIC_E2E=1 \
    EXPO_PUBLIC_API_URL="$E2E_API_URL_VALUE" \
    npx expo start --dev-client --lan --port "$METRO_PORT" \
    >"$METRO_LOG_FILE" 2>&1 &
  metro_pid="$!"
  E2E_METRO_PID="$metro_pid"
  E2E_METRO_STARTED=1
  printf '%s\n' "$metro_pid" >"$METRO_PID_FILE"

  attempts=0
  until metro_is_ready; do
    attempts=$((attempts + 1))
    if ! kill -0 "$metro_pid" 2>/dev/null || [ "$attempts" -ge 45 ]; then
      echo "Metro E2E n'a pas démarré. Dernières lignes :" >&2
      tail -40 "$METRO_LOG_FILE" >&2
      exit 1
    fi
    sleep 1
  done

  E2E_METRO_HOST="$(
    sed -n 's/.*Waiting on http:\/\/\([^:]*\):[0-9][0-9]*/\1/p' "$METRO_LOG_FILE" |
      tail -n 1
  )"
  case "$E2E_METRO_HOST" in
    "" | localhost | 127.* | ::1)
      E2E_METRO_HOST="$(ipconfig getifaddr en0 2>/dev/null || true)"
      ;;
  esac
  if [ -z "$E2E_METRO_HOST" ]; then
    E2E_METRO_HOST="$(ipconfig getifaddr en1 2>/dev/null || true)"
  fi
  if [ -z "$E2E_METRO_HOST" ]; then
    echo "Impossible de déterminer l'adresse LAN annoncée par Metro." >&2
    tail -40 "$METRO_LOG_FILE" >&2
    exit 1
  fi

  printf '%s\n' "$expected_settings" >"$METRO_SETTINGS_FILE"
  printf '%s\n' "$E2E_METRO_HOST" >"$METRO_HOST_FILE"
  echo "Metro E2E démarré sur le port ${METRO_PORT}."
}

e2e_require_tools
e2e_find_or_create_simulator
e2e_boot_simulator
mkdir -p "$DEV_STATE_DIR"

fingerprint="$(native_fingerprint)"
installed=0
if xcrun simctl get_app_container "$E2E_SIMULATOR_UDID" "$E2E_APP_ID" >/dev/null 2>&1; then
  installed=1
fi

recorded_fingerprint=""
if [ -f "$NATIVE_FINGERPRINT_FILE" ]; then
  recorded_fingerprint="$(sed -n '1p' "$NATIVE_FINGERPRINT_FILE")"
fi

if [ "${E2E_FORCE_BUILD:-0}" = "1" ] || [ "$installed" = "0" ] ||
  [ "$recorded_fingerprint" != "$fingerprint" ]; then
  echo "Préparation du development build E2E (build natif initial ou devenu obsolète)."
  APP_VARIANT=e2e \
  EXPO_PUBLIC_E2E=1 \
  EXPO_PUBLIC_API_URL="$E2E_API_URL_VALUE" \
    npx expo prebuild --platform ios

  # En Debug, Expo CLI force Metro même avec `--no-bundler` lorsqu'il installe directement sur
  # un Simulator. Le build générique évite cette branche : Expo compile et rend la main, puis
  # `simctl install` pose explicitement le binaire sur notre Simulator déjà démarré.
  build_output_dir="$(mktemp -d "${TMPDIR:-/tmp}/grrind-e2e-dev.XXXXXX")"
  cleanup_build_output() {
    rm -rf "$build_output_dir"
  }
  trap cleanup_build_output EXIT HUP INT TERM

  APP_VARIANT=e2e \
  EXPO_PUBLIC_E2E=1 \
  EXPO_PUBLIC_API_URL="$E2E_API_URL_VALUE" \
    npx expo run:ios --configuration Debug --no-bundler --device generic \
      --output "$build_output_dir"

  xcrun simctl install "$E2E_SIMULATOR_UDID" "$build_output_dir/GRRINDE2E.app"
  cleanup_build_output
  trap - EXIT HUP INT TERM

  printf '%s\n' "$fingerprint" >"$NATIVE_FINGERPRINT_FILE"
else
  echo "Development build E2E déjà installé et à jour : aucun build natif."
fi

ensure_metro

DEV_CLIENT_URL="exp+grrind-app://expo-development-client/?url=http%3A%2F%2F${E2E_METRO_HOST}%3A${METRO_PORT}"
xcrun simctl openurl "$E2E_SIMULATOR_UDID" "$DEV_CLIENT_URL"

elapsed=$(( $(date +%s) - STARTED_AT ))
echo "Environnement iOS E2E dev prêt en ${elapsed}s."
echo "Boucle suivante : npm run e2e:ios:flow"

if [ "$E2E_METRO_STARTED" = "1" ]; then
  echo "Metro reste actif dans ce terminal (Ctrl+C pour l'arrêter)."
  wait "$E2E_METRO_PID"
fi
