#!/bin/sh

# Fonctions communes aux deux cycles iOS E2E. Ce fichier est sourcé par les scripts publics ;
# il ne constitue pas une commande à lancer directement.

E2E_API_URL_VALUE="${E2E_API_URL:-http://localhost:8080}"
E2E_SIMULATOR_NAME_VALUE="${E2E_SIMULATOR_NAME:-GRRIND E2E}"
E2E_APP_ID="app.grrind.e2e"
E2E_PASSWORD="e2e-password-assez-long"

e2e_configure_java() {
  if [ -z "${JAVA_HOME:-}" ] && command -v brew >/dev/null 2>&1; then
    JAVA_HOME="$(brew --prefix openjdk)/libexec/openjdk.jdk/Contents/Home"
    export JAVA_HOME
  fi

  if [ ! -x "${JAVA_HOME:-}/bin/java" ]; then
    echo "Java 17 ou plus récent manque. Installe-le avec: brew install openjdk" >&2
    exit 1
  fi
}

e2e_require_tools() {
  e2e_configure_java

  if ! command -v maestro >/dev/null 2>&1; then
    echo "Maestro manque. Installe-le avec: brew install mobile-dev-inc/tap/maestro" >&2
    exit 1
  fi
}

e2e_require_backend() {
  curl --connect-timeout 5 --max-time 30 --retry 3 -fsS \
    "${E2E_API_URL_VALUE}/health" >/dev/null
}

e2e_register_accounts() {
  run_id="$(date +%s)-$$"
  E2E_EMPTY_EMAIL="grrind-e2e-empty-${run_id}@example.test"
  E2E_MULTIPLE_EMAIL="grrind-e2e-multiple-${run_id}@example.test"
  export E2E_EMPTY_EMAIL E2E_MULTIPLE_EMAIL

  e2e_register_account "$E2E_EMPTY_EMAIL" "E2E Sans séance"
  e2e_register_account "$E2E_MULTIPLE_EMAIL" "E2E Plusieurs séances"
}

e2e_register_account() {
  email="$1"
  display_name="$2"
  curl --connect-timeout 5 --max-time 30 --retry 3 -fsS \
    -X POST "${E2E_API_URL_VALUE}/api/auth/register" \
    -H "Content-Type: application/json" \
    --data "{\"email\":\"${email}\",\"password\":\"${E2E_PASSWORD}\",\"displayName\":\"${display_name}\",\"timezone\":\"Europe/Paris\"}" \
    >/dev/null
}

e2e_find_or_create_simulator() {
  E2E_SIMULATOR_UDID="$(
    xcrun simctl list devices available |
      sed -n "/^[[:space:]]*${E2E_SIMULATOR_NAME_VALUE} (/s/.*(\([0-9A-Fa-f-]\{36\}\)).*/\1/p" |
      head -n 1
  )"

  if [ -z "$E2E_SIMULATOR_UDID" ]; then
    device_type="$(
      xcrun simctl list devicetypes |
        awk -F '[()]' '/iPhone/ { print $2; exit }'
    )"
    runtime="$(
      xcrun simctl list runtimes |
        awk -F ' - ' '/^iOS/ && !/unavailable/ { runtime = $NF } END { print runtime }'
    )"

    if [ -z "$device_type" ] || [ -z "$runtime" ]; then
      echo "Aucun runtime iOS Simulator disponible." >&2
      exit 1
    fi

    E2E_SIMULATOR_UDID="$(
      xcrun simctl create "$E2E_SIMULATOR_NAME_VALUE" "$device_type" "$runtime"
    )"
  fi

  export E2E_SIMULATOR_UDID
}

e2e_boot_simulator() {
  xcrun simctl boot "$E2E_SIMULATOR_UDID" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$E2E_SIMULATOR_UDID" -b
}

e2e_require_installed_app() {
  if ! xcrun simctl get_app_container "$E2E_SIMULATOR_UDID" "$E2E_APP_ID" \
    >/dev/null 2>&1; then
    echo "$E2E_APP_ID n'est pas installée. Lance d'abord: npm run e2e:ios:dev" >&2
    exit 1
  fi
}

e2e_reset_state() {
  # Le refresh token vit dans SecureStore : effacer le conteneur de l'app ne suffit pas. Ce
  # Simulator est dédié à GRRIND, donc son trousseau peut être remis à zéro sans toucher au
  # Simulator de développement ni à un appareil réel.
  xcrun simctl keychain "$E2E_SIMULATOR_UDID" reset
  maestro --device "$E2E_SIMULATOR_UDID" test .maestro/ios-reset-state.yaml >/dev/null
}

e2e_run_flow() {
  flow_path="$1"
  shift

  mkdir -p artifacts/e2e
  maestro --device "$E2E_SIMULATOR_UDID" test \
    --test-output-dir artifacts/e2e \
    --format JUNIT \
    --output artifacts/e2e/report.xml \
    -e EMPTY_EMAIL="$E2E_EMPTY_EMAIL" \
    -e MULTIPLE_EMAIL="$E2E_MULTIPLE_EMAIL" \
    -e PASSWORD="$E2E_PASSWORD" \
    "$@" \
    "$flow_path"
}
