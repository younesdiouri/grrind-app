/**
 * Une date civile, en toutes lettres : « 2 novembre 2025 ».
 *
 * `formatWhen` (côté progression) est *relatif* — « aujourd'hui », « hier » — parce qu'une
 * séance se compare à maintenant. Une fondation de guilde ou une inscription ne se comparent
 * à rien : « il y a 340 jours » demanderait un calcul mental, l'année ne s'efface donc jamais
 * ici, contrairement à `formatWhen` qui la tait pour une séance récente.
 *
 * Pure, sans React, sans horloge implicite : prouvée sur ses cas limites dans
 * `format.test.ts` sans monter un écran.
 */
export function formatCalendarDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
