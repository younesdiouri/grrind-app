import { combatMotion, duration } from '@/design/tokens';
import type { Actor } from './timeline.ts';

/** Le poids d'un impact : il multiplie le tremblement, et le coup final appelle la caméra. */
export const IMPACT = { blow: 1, critical: 2, final: 3 } as const;
/** Un coup qui porte : quand, avec quel poids, et sur quel camp — c'est là que jaillissent les étincelles. */
export type Impact = { at: number; strength: number; target: Actor };

/** Le dernier impact à `time`, ou rien. Les impacts sont triés : recherche logarithmique. */
export function impactAt(impacts: Impact[], time: number): Impact | undefined {
  'worklet';
  let low = 0;
  let high = impacts.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (impacts[middle].at <= time) low = middle + 1;
    else high = middle;
  }
  return impacts[low - 1];
}

/**
 * La caméra de la scène à `time` : un tremblement qui s'amortit après chaque impact, et une
 * approche sur le coup final. Pure, comme le reste de la mise en scène — les impacts sont des
 * instants déjà connus, triés, que `timeline.ts` ou l'adaptateur du raid ont posés.
 */
export function cameraAt(impacts: Impact[], time: number, reduced: boolean) {
  'worklet';
  const state = { x: 0, y: 0, scale: 1 };
  if (reduced) return state;
  const impact = impactAt(impacts, time);
  if (!impact) return state;
  const elapsed = time - impact.at;
  const decay = 1 - elapsed / combatMotion.shakeDuration;
  if (decay > 0) {
    const amplitude = combatMotion.shake * impact.strength * decay;
    const phase = elapsed / combatMotion.shakePeriod * Math.PI * 2;
    state.x = Math.sin(phase) * amplitude;
    state.y = Math.cos(phase * 1.3) * amplitude / 2;
  }
  if (impact.strength >= IMPACT.final) {
    state.scale = 1 + Math.sin(Math.min(1, elapsed / duration.flip) * Math.PI) * combatMotion.finalZoom;
  }
  return state;
}
