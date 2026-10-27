import type { UnityViewport } from '@/features/combat/unityFrame';

/** Le runtime Unity est dimensionné sur sa vue parente ; les barres extérieures sont déjà exclues. */
export function appearanceViewport({ height, controlsHeight, headerHeight = 0, safeTop = 0, safeBottom = 0 }: {
  height: number; controlsHeight: number; headerHeight?: number; safeTop?: number; safeBottom?: number;
}): UnityViewport | null {
  const available = height - headerHeight - safeTop - controlsHeight - safeBottom;
  if (height <= 0 || available <= 0) return null;
  return { x: 0, y: (controlsHeight + safeBottom) / height, width: 1, height: available / height };
}
