Pod::Spec.new do |s|
  s.name = 'GrrindUnity'
  s.version = '0.1.0'
  s.summary = 'Unity combat renderer'
  s.author = 'GRRIND'
  s.homepage = 'https://github.com/younesdiouri/grrind-app'
  s.platforms = { :ios => '16.4' }
  s.source = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'UIKit'
  s.source_files = '*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  # EAS uploads the local export via .easignore; never ship a production app without it.
  unity_framework = File.join(__dir__, 'Frameworks/UnityFramework.xcframework')
  if ENV['EAS_BUILD_PROFILE'] == 'production' && !File.directory?(unity_framework)
    raise 'UnityFramework absent. Run ./scripts/unity-ios.sh before the EAS production build.'
  end
  if File.directory?(unity_framework)
    s.vendored_frameworks = 'Frameworks/UnityFramework.xcframework'
    # Unity's simulator export targets Apple Silicon; the generic Expo build also requests Intel.
    s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64',
      'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) GRRIND_HAS_UNITY=1' }
    s.user_target_xcconfig = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64' }
  end
end
