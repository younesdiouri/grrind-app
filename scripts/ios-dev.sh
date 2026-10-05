#!/bin/sh
set -eu

# Only regenerate the shared native project when its config or variant changed.
export APP_VARIANT=development
fingerprint="$(node scripts/ios-native-fingerprint.cjs)"
recorded="$(cat ios/.grrind-native-fingerprint 2>/dev/null || true)"
if [ "$recorded" != "$fingerprint" ]; then
  npx expo prebuild --clean --platform ios
  printf '%s\n' "$fingerprint" >ios/.grrind-native-fingerprint
fi
npx expo run:ios --device "$@"
