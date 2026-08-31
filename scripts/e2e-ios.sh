#!/bin/sh

# Validation iOS E2E complète. Ce chemin conserve le cycle propre historique : effacement du
# Simulator, prebuild clean, build Release, installation et flow Maestro.
#
# `E2E_SKIP_BUILD=1` reste accepté pour compatibilité avec l'ancienne boucle courte. Il réutilise
# le bundle Release déjà installé ; pour les changements JS/TS, utiliser désormais les commandes
# Metro `e2e:ios:dev` puis `e2e:ios:flow`.

set -eu

. "$(dirname "$0")/e2e-ios-common.sh"

STARTED_AT="$(date +%s)"

e2e_require_tools
e2e_require_backend
e2e_register_accounts
e2e_find_or_create_simulator

if [ "${E2E_SKIP_BUILD:-0}" = "1" ]; then
  e2e_boot_simulator
  e2e_require_installed_app
  echo "Compatibilité E2E_SKIP_BUILD : réutilisation du bundle natif déjà installé."
else
  xcrun simctl shutdown "$E2E_SIMULATOR_UDID" >/dev/null 2>&1 || true
  xcrun simctl erase "$E2E_SIMULATOR_UDID"
  e2e_boot_simulator

  APP_VARIANT=e2e \
  EXPO_PUBLIC_E2E=1 \
  EXPO_PUBLIC_API_URL="$E2E_API_URL_VALUE" \
    npx expo prebuild --clean --platform ios

  APP_VARIANT=e2e \
  EXPO_PUBLIC_E2E=1 \
  EXPO_PUBLIC_API_URL="$E2E_API_URL_VALUE" \
    npx expo run:ios --configuration Release --no-bundler --device "$E2E_SIMULATOR_UDID"

  # Le build Release remplace le development build puisqu'ils partagent volontairement
  # l'identifiant E2E. La prochaine préparation dev reconstruira donc une seule fois.
  rm -f artifacts/e2e/dev/native-fingerprint
fi

e2e_reset_state
e2e_run_flow .maestro/ios-smoke.yaml

elapsed=$(( $(date +%s) - STARTED_AT ))
echo "Validation iOS E2E complète terminée en ${elapsed}s."
