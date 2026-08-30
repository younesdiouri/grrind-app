#!/bin/sh

# Le smoke test mobile iOS. Voir docs/ai/mobile-qa.md.
#
# `E2E_SKIP_BUILD=1` réutilise l'app déjà installée sur le simulateur et n'exécute que le
# flow Maestro. C'est la boucle courte : tant qu'on ne corrige que des sélecteurs ou un
# enchaînement d'écrans, rien ne justifie de reconstruire. Dès qu'on touche au code de
# l'app, on relance sans ce drapeau.

set -eu

API_URL="${E2E_API_URL:-http://localhost:8080}"
SIMULATOR_NAME="${E2E_SIMULATOR_NAME:-GRRIND E2E}"
PASSWORD="e2e-password-assez-long"
RUN_ID="$(date +%s)"
EMPTY_EMAIL="grrind-e2e-empty-${RUN_ID}@example.test"
MULTIPLE_EMAIL="grrind-e2e-multiple-${RUN_ID}@example.test"

if [ -z "${JAVA_HOME:-}" ] && command -v brew >/dev/null 2>&1; then
  JAVA_HOME="$(brew --prefix openjdk)/libexec/openjdk.jdk/Contents/Home"
  export JAVA_HOME
fi

if [ ! -x "${JAVA_HOME:-}/bin/java" ]; then
  echo "Java 17 ou plus récent manque. Installe-le avec: brew install openjdk" >&2
  exit 1
fi

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro manque. Installe-le avec: brew install mobile-dev-inc/tap/maestro" >&2
  exit 1
fi

curl --connect-timeout 5 --max-time 30 --retry 3 -fsS "${API_URL}/health" >/dev/null

register_account() {
  email="$1"
  display_name="$2"
  curl --connect-timeout 5 --max-time 30 --retry 3 -fsS \
    -X POST "${API_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    --data "{\"email\":\"${email}\",\"password\":\"${PASSWORD}\",\"displayName\":\"${display_name}\",\"timezone\":\"Europe/Paris\"}" \
    >/dev/null
}

register_account "$EMPTY_EMAIL" "E2E Sans séance"
register_account "$MULTIPLE_EMAIL" "E2E Plusieurs séances"

SIMULATOR_UDID="$(
  xcrun simctl list devices available |
    sed -n "/^[[:space:]]*${SIMULATOR_NAME} (/s/.*(\([0-9A-Fa-f-]\{36\}\)).*/\1/p" |
    head -n 1
)"

if [ -z "$SIMULATOR_UDID" ]; then
  DEVICE_TYPE="$(
    xcrun simctl list devicetypes |
      awk -F '[()]' '/iPhone/ { print $2; exit }'
  )"
  RUNTIME="$(
    xcrun simctl list runtimes |
      awk -F ' - ' '/^iOS/ && !/unavailable/ { runtime = $NF } END { print runtime }'
  )"

  if [ -z "$DEVICE_TYPE" ] || [ -z "$RUNTIME" ]; then
    echo "Aucun runtime iOS Simulator disponible." >&2
    exit 1
  fi

  SIMULATOR_UDID="$(xcrun simctl create "$SIMULATOR_NAME" "$DEVICE_TYPE" "$RUNTIME")"
fi

if [ "${E2E_SKIP_BUILD:-0}" = "1" ]; then
  xcrun simctl boot "$SIMULATOR_UDID" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$SIMULATOR_UDID" -b

  if ! xcrun simctl get_app_container "$SIMULATOR_UDID" app.grrind.e2e >/dev/null 2>&1; then
    echo "app.grrind.e2e n'est pas installée : relance sans E2E_SKIP_BUILD." >&2
    exit 1
  fi
else
  xcrun simctl shutdown "$SIMULATOR_UDID" >/dev/null 2>&1 || true
  xcrun simctl erase "$SIMULATOR_UDID"
  xcrun simctl boot "$SIMULATOR_UDID"
  xcrun simctl bootstatus "$SIMULATOR_UDID" -b

  APP_VARIANT=e2e \
  EXPO_PUBLIC_E2E=1 \
  EXPO_PUBLIC_API_URL="$API_URL" \
    npx expo prebuild --clean --platform ios

  APP_VARIANT=e2e \
  EXPO_PUBLIC_E2E=1 \
  EXPO_PUBLIC_API_URL="$API_URL" \
    npx expo run:ios --configuration Release --no-bundler --device "$SIMULATOR_UDID"
fi

# Le jeton de rafraîchissement vit dans le trousseau (invariant n°3), et le trousseau du
# simulateur survit à tout ce qui ressemble à une remise à zéro de l'app : `clearState` de
# Maestro vide le conteneur de données, pas le trousseau. Sans cette ligne, un deuxième
# passage repart connecté au compte du passage précédent, et le flow attend un écran de
# connexion qui ne viendra pas.
xcrun simctl keychain "$SIMULATOR_UDID" reset

mkdir -p artifacts/e2e

maestro --device "$SIMULATOR_UDID" test \
  --test-output-dir artifacts/e2e \
  --format JUNIT \
  --output artifacts/e2e/report.xml \
  -e EMPTY_EMAIL="$EMPTY_EMAIL" \
  -e MULTIPLE_EMAIL="$MULTIPLE_EMAIL" \
  -e PASSWORD="$PASSWORD" \
  .maestro/ios-smoke.yaml
