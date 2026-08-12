// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // `schema.d.ts` est généré depuis openapi.yaml — il se régénère, il ne se corrige pas.
    // `ios/` et `android/` sont produits par prebuild et non versionnés.
    ignores: ['dist/*', 'src/api/schema.d.ts', 'ios/*', 'android/*'],
  },
]);
