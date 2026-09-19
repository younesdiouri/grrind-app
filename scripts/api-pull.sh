#!/bin/sh
set -eu

# Pendant l'implémentation parallèle, consomme le même export officiel avant son premier push.
if [ -n "${GRRIND_API_FILE:-}" ]; then
  cp "$GRRIND_API_FILE" api/openapi.yaml
  exit 0
fi

# Une PR cliente peut vérifier le contrat de sa PR serveur avant leur fusion ordonnée.
# Sans override, la référence de production reste main.
ref="${GRRIND_API_REF:-main}"
curl -sfL -o api/openapi.yaml "https://raw.githubusercontent.com/younesdiouri/grrind-back/${ref}/openapi.yaml"
