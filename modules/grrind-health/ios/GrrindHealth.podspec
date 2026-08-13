Pod::Spec.new do |s|
  s.name           = 'GrrindHealth'
  s.version        = '1.0.0'
  s.summary        = "Le pont vers HealthKit : lecture des workouts, sans vue ni règle de jeu."
  s.description    = "Module natif local de GRRIND. Lit les séances d'Apple Santé et les rend au format `ImportedWorkout` du contrat, sans traduire ni filtrer."
  s.author         = 'GRRIND'
  s.homepage       = 'https://github.com/younesdiouri/grrind-app'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # `statistics(for:)` demande iOS 16, ce que la plateforme ci-dessus garantit déjà. Le lien
  # explicite au framework évite de dépendre de la directive d'autolink que Swift émet sur
  # `import HealthKit` — elle marche, mais elle est invisible dans un journal de build raté.
  s.frameworks = 'HealthKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
