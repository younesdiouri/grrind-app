/**
 * Determines whether the tactical ambient backdrop animation loop should run.
 *
 * Honors the system accessibility preference for reduced motion and halts
 * background clock execution whenever the application is not actively focused.
 *
 * @param reducedMotion - Boolean indicating if the user has requested reduced motion, or null if unmeasured.
 * @param appState - Current React Native AppStateStatus ('active', 'background', 'inactive').
 * @returns True only when animation is explicitly permitted and the app is active.
 */
export function shouldAnimateBackdrop(
  reducedMotion: boolean | null,
  appState: string,
): boolean {
  if (reducedMotion !== false) {
    return false;
  }

  return appState === 'active';
}
