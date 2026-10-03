import type { components } from '@/api/schema';

export type SyncSummary = components['schemas']['SyncSummary'];
export type SyncTotals = components['schemas']['SyncTotals'];
export type RewardSummary = components['schemas']['RewardSummary'];
export type XpLine = components['schemas']['XpLine'];
export type DroppedItem = components['schemas']['DroppedItem'];
export type SkippedWorkout = SyncSummary['skipped'][number];
/** Pourquoi une séance créditée n'a rien rapporté. `null` pour tout crédit normal. */
export type XpNoCreditReason = NonNullable<RewardSummary['xp']['reason']>;

/** Le halo vert suit le total XP que le compteur affiche, jamais le seul fait d'un import. */
export function hasAwardedXp(totals: SyncTotals | null): boolean {
  return totals !== null && totals.xpAwarded > 0;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * La largeur d'un palier, en XP : ce qui y est déjà acquis plus ce qu'il reste à faire.
 *
 * Un `xpToNext` à `null` signifie le niveau maximum — la barre est pleine et le reste.
 */
function spanOf(xpInto: number, xpToNext: number | null): number | null {
  return xpToNext === null ? null : xpInto + xpToNext;
}

/** Où en était la barre avant ce workout. */
export function fillBefore(level: RewardSummary['level']): number {
  const span = spanOf(level.xpIntoLevelBefore, level.xpToNextLevelBefore);
  return span === null || span === 0 ? 1 : clamp01(level.xpIntoLevelBefore / span);
}

/** Où elle est après. */
export function fillAfter(level: RewardSummary['level']): number {
  const span = spanOf(level.xpIntoLevel, level.xpToNextLevel);
  return span === null || span === 0 ? 1 : clamp01(level.xpIntoLevel / span);
}
