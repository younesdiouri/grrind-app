#!/bin/sh
set -eu
test_binary="$(mktemp -t grrind-health-native)"
trap 'rm -f "$test_binary"' EXIT
swiftc modules/grrind-health/ios/SportEvidenceStore.swift modules/grrind-health/ios/SportUploadOutbox.swift scripts/tests/sport-evidence.swift -o "$test_binary"
"$test_binary"
