#!/bin/sh
set -eu

# Une PR cliente peut vérifier le contrat de sa PR serveur avant leur fusion ordonnée.
# Sans override, la référence de production reste main.
ref="${GRRIND_API_REF:-main}"
curl -sfL -o api/openapi.yaml "https://raw.githubusercontent.com/younesdiouri/grrind-back/${ref}/openapi.yaml"
