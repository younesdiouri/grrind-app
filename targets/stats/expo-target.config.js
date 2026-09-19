/**
 * La cible Xcode du widget (#174) — déclarée ici parce qu'elle ne peut pas vivre dans `/ios`.
 *
 * `/ios` est gitignoré et `npm run prebuild` passe `--clean` : une cible ajoutée à la main
 * dans Xcode disparaît à la génération suivante. `@bacons/apple-targets` lit ce fichier et
 * relie `targets/stats/` au projet à chaque prebuild, donc la cible survit.
 *
 * **Les couleurs sont recopiées de `src/design/tokens.ts`, et c'est la seule exception au
 * sens unique du design system.** Ce fichier est évalué au prebuild par Node, sans la chaîne
 * TypeScript du bundle : il ne peut pas importer les tokens. Les valeurs sont donc dupliquées
 * ici, à quatre-vingts caractères de leur source, plutôt que de faire entrer SwiftUI dans une
 * chaîne de génération qu'il faudrait maintenir à vie pour dix teintes. Si une de ces teintes
 * change dans `tokens.ts`, elle change ici — et nulle part ailleurs.
 *
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'stats',
  // Ce que le joueur lit dans la galerie de widgets d'iOS, sous la vignette.
  displayName: 'GRRIND',
  /**
   * Le point initial fait de l'identifiant celui de l'app **de la variante en cours**, suffixé :
   * `app.grrind.stats`, `app.grrind.dev.stats`, `app.grrind.e2e.stats`. C'est aussi ce dont
   * `TargetStats.swift` se sert pour retrouver son conteneur partagé.
   */
  bundleIdentifier: '.stats',
  /**
   * 17.0 et pas le défaut du plugin : `containerBackground` — obligatoire pour qu'un widget
   * s'affiche sur iOS 17 et au-delà — y apparaît, et descendre plus bas demanderait deux
   * rendus à maintenir pour des appareils qu'aucun testeur n'a.
   */
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  /**
   * L'App Group, **relu de la config de l'app** et non recopié.
   *
   * Le plugin documente un report automatique depuis `ios.entitlements` ; il ne s'est pas
   * produit pour cette cible — le `CODE_SIGN_ENTITLEMENTS` du projet généré restait vide, et
   * une extension sans entitlement ne voit tout simplement pas le conteneur partagé. Le widget
   * serait resté sur « ouvre l'app » pour toujours, sans la moindre erreur nulle part.
   *
   * Passer par `config` garde la variante comme seule source : `app.config.ts` décide,
   * `app.grrind.dev.stats` reçoit `group.app.grrind.dev`, et rien n'est écrit en dur ici.
   */
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'],
  },
  colors: {
    background: '#050816',
    surface: '#16213D',
    text: '#EAF6FF',
    textMuted: '#8290AE',
    /** L'XP, et l'accent du produit. */
    accent: '#35E4FF',
    /** Le niveau — la lumière blanche reste exceptionnelle. */
    celebrate: '#F7FCFF',
    /** Les quatre teintes du cercle de vie (#69), nommées comme les clés de l'instantané. */
    strength: '#A98BFF',
    endurance: '#67D8FF',
    mobility: '#C2FF6C',
    dexterity: '#FF79CE',
  },
});
