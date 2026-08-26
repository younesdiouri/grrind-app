/**
 * La taille du chiffre de Vitality — calculée pour tenir dans le centre de l'anneau, jamais
 * mesurée.
 *
 * Vitality n'a pas de plafond : les fixtures du séquenceur la montrent déjà à 184 après
 * quinze séances (#69), et un jour elle passera quatre chiffres, puis cinq. La mesurer à
 * l'exécution (`adjustsFontSizeToFit`) ne servirait à rien dans une preview statique — Node
 * ne fait tourner aucun layout, le texte s'y rendrait à sa taille maximale, débordant du
 * cercle sans que personne ne le voie avant un joueur réel. Le calcul, lui, rend le même
 * résultat partout : Node, iOS, Android.
 *
 * Deux marges, pour ne jamais dépasser plutôt que d'être exact : `DIGIT_WIDTH_RATIO` (0,6 ×
 * la taille de police par chiffre) approxime la largeur de glyphes tabulaires, qui varie
 * légèrement d'une police système à l'autre ; `USABLE_DIAMETER_RATIO` retire une marge au
 * diamètre disponible, pour absorber cette imprécision sans jamais toucher le trait.
 */
const DIGIT_WIDTH_RATIO = 0.6;
const USABLE_DIAMETER_RATIO = 0.9;

export function vitalityFontSize(value: number, innerDiameter: number, maxFontSize: number): number {
  const digits = Math.max(1, Math.trunc(Math.abs(value)).toString().length);
  const usableDiameter = innerDiameter * USABLE_DIAMETER_RATIO;

  return Math.min(maxFontSize, usableDiameter / (digits * DIGIT_WIDTH_RATIO));
}
