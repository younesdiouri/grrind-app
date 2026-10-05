// Expo fingerprints config plugins and autolinked native dependencies, not the whole lockfile.
const { createFingerprintAsync, SourceSkips } = require('@expo/fingerprint');

createFingerprintAsync(process.cwd(), {
  platforms: ['ios'],
  silent: true,
  sourceSkips: SourceSkips.PackageJsonScriptsAll,
  ignorePaths: ['targets/*/Assets.xcassets/**/*'],
  extraSources: [{ type: 'dir', filePath: 'targets', reasons: ['appleTargets'] }],
}).then(({ hash }) => console.log(hash)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
