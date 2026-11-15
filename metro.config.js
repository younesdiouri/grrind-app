const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SDK57 fusionne aussi .env dans expo/virtual/env : le harnais doit ignorer ces fichiers
// côté client pour respecter EXPO_NO_DOTENV, sans modifier le Metro du téléphone.
// https://docs.expo.dev/versions/v57.0.0/config/metro/#disabling-dotenv-files
if (process.env.EXPO_NO_DOTENV === '1') {
  const current = config.resolver.blockList;
  config.resolver.blockList = [
    ...(Array.isArray(current) ? current : current ? [current] : []),
    /\/\.env(?:\.[^/]*)?$/,
  ];
}

module.exports = config;
