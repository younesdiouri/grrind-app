// iOS 27 refuses to launch an app built with its SDK unless it adopts the UIScene life cycle.
// expo@57.0.30 ships `ExpoAppSceneDelegate` (Info.plist, see app.json), but the SDK 57 template
// still starts React Native from the app delegate. This mirrors the SDK 58 template: the app
// delegate only creates the factory, and the scene delegate creates the window and starts it.
// Remove this plugin when upgrading to SDK 58.
const { withAppDelegate } = require('expo/config-plugins');

const START_FROM_APP_DELEGATE = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

module.exports = (config) =>
  withAppDelegate(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes('ExpoReactNativeFactoryProvider')) return config;
    if (!contents.includes(START_FROM_APP_DELEGATE)) {
      throw new Error('withSceneLifecycle: AppDelegate.swift no longer matches the SDK 57 template.');
    }
    contents = contents
      .replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
      .replace(START_FROM_APP_DELEGATE, '');
    config.modResults.contents = contents;
    return config;
  });
