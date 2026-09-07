import { combatMotion, duration } from '@/design/tokens';

export type EntrancePhase = 'loading' | 'entering' | 'dialogue' | 'combat';

/** Une horloge réutilisée : -1 → 0 pour l'arrivée, 0 → 1 pour respirer, puis les ms du combat. */
export function entranceMotionAt(phase: EntrancePhase, time: number, reduced: boolean) {
  'worklet';
  const state = { opacity: 1, y: 0, scale: 1, top: combatMotion.dialogueTop as number,
    bottom: 0, dialogueOpacity: 1 };
  if (phase === 'loading') return { ...state, opacity: 0, dialogueOpacity: 0 };
  if (phase === 'entering' && !reduced) {
    const progress = Math.max(0, Math.min(1, time + 1));
    state.opacity = progress;
    state.y = (1 - progress) * combatMotion.arrivalTravel;
    state.scale = combatMotion.arrivalScale + progress * (1 - combatMotion.arrivalScale);
    state.dialogueOpacity = Math.max(0, Math.min(1, 1 - time / combatMotion.dialogueReveal));
  } else if (phase === 'dialogue' && !reduced) {
    state.y = Math.sin(time * Math.PI * 2) * combatMotion.breath;
  } else if (phase === 'combat') {
    const progress = reduced ? 1 : Math.max(0, Math.min(1, time / duration.enter));
    state.top *= 1 - progress;
    state.bottom = progress * combatMotion.combatBottom;
    state.dialogueOpacity = 0;
  }
  return state;
}
