import type { HealthProvider } from '@/features/health/provider';

/**
 * Le fournisseur des plateformes qui n'en ont pas encore.
 *
 * **La sélection passe par les extensions de Metro**, pas par un `Platform.OS` à l'exécution, et
 * c'est structurel : un `if` laisserait l'`import` du module natif s'exécuter quand même, et
 * `requireNativeModule('GrrindHealth')` jette sur une plateforme où il n'est pas lié. Metro
 * résout `./current` vers `current.ios.ts` sur iPhone et vers ce fichier partout ailleurs — les
 * deux mondes ne se croisent jamais.
 *
 * Android tombe donc ici, et y restera jusqu'au #15. Ce n'est pas un bouchon vide : c'est la
 * réponse exacte de la plateforme aujourd'hui. `isAvailable()` rend `false`, la synchronisation
 * (#16) ne part pas, et rien ne prétend le contraire — un bouchon qui rendrait `[]` sur
 * `workoutsSince()` produirait une synchronisation qui « réussit » sans jamais rien importer,
 * ce qui est la panne la plus difficile à voir de toutes.
 */
export const healthProvider: HealthProvider = {
  isAvailable: async () => false,

  requestAuthorization: async () => {
    throw new Error("Aucun fournisseur de santé sur cette plateforme.");
  },

  workoutsSince: async () => {
    throw new Error("Aucun fournisseur de santé sur cette plateforme.");
  },
};
