/** Conversion d’unité uniquement ; quatre décimales préservent le millionième serveur. */
export function probabilityPercent(millionths: number): string {
  return `${(millionths / 10000).toLocaleString('fr-FR', { maximumFractionDigits: 4 })} %`;
}
