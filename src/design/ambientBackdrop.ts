/**
 * La décision reste pure : `null` est l'état sûr tant que la préférence native n'a pas
 * répondu, et l'arrière-plan ne consomme aucune animation hors du premier plan.
 */
export function shouldAnimateBackdrop(
  reducedMotion: boolean | null,
  appIsActive: boolean,
): boolean {
  return reducedMotion === false && appIsActive;
}
