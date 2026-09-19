Pod::Spec.new do |s|
  s.name           = 'GrrindWidget'
  s.version        = '1.0.0'
  s.summary        = "Le pont vers le widget : écrire l'instantané dans le conteneur partagé, et rien d'autre."
  s.description    = "Module natif local de GRRIND. Dépose la charge utile du widget dans l'App Group de la variante et redemande à WidgetKit de retracer ses timelines. Ne lit rien, ne décide rien, ne met rien en forme."
  s.author         = 'GRRIND'
  s.homepage       = 'https://github.com/younesdiouri/grrind-app'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Lien explicite plutôt que la directive d'autolink émise par `import WidgetKit` — même
  # raison que dans `GrrindHealth.podspec` : elle marche, mais elle est invisible dans un
  # journal de build raté.
  s.frameworks = 'WidgetKit'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
