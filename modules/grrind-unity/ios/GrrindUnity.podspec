Pod::Spec.new do |s|
  s.name = 'GrrindUnity'
  s.version = '0.1.0'
  s.summary = 'Local Unity combat spike bridge'
  s.author = 'GRRIND'
  s.homepage = 'https://github.com/younesdiouri/grrind-app'
  s.platforms = { :ios => '16.4' }
  s.source = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'UIKit'
  s.source_files = '*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  # Built by scripts/unity-ios.sh; this spike remains optional in ordinary builds.
  if File.exist?(File.join(__dir__, 'Frameworks/UnityFramework.xcframework'))
    s.vendored_frameworks = 'Frameworks/UnityFramework.xcframework'
    # Unity's simulator export targets Apple Silicon; the generic Expo build also requests Intel.
    s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64',
      'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) GRRIND_HAS_UNITY=1' }
    s.user_target_xcconfig = { 'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64' }
  end
end
