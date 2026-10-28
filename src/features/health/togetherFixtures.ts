import unWorkout from '@/../fixtures/sync-summary/un-workout.json' with { type: 'json' };
import type { SyncSummary } from '@/features/reward/timeline';
import type { TogetherBonus } from '@/features/health/togetherInbox';

// Reçu synthétique pour tests/préviews, avec paliers tirés d'une fixture serveur capturée.
const reward = (unWorkout as unknown as SyncSummary).imported[0];
export const TOGETHER_BONUS_FIXTURE: TogetherBonus = {
  id: '01900000-0000-7000-8000-000000000001', workoutId: reward.session.id,
  occurredAt: reward.session.startedAt, createdAt: reward.session.endedAt,
  previousMultiplier: 2, multiplier: 3, soloXp: 100, bonusXp: 17, totalBonusXp: 999, workoutTotalXp: 1099,
  xp: { awarded: 17, breakdown: [{ source: 'TOGETHER', amount: 17 }] },
  attributes: reward.attributes, level: reward.level, skillPointsGranted: 3, titlesUnlocked: reward.titlesUnlocked,
  rulesetVersion: 'synthetic', detectionRulesetVersion: 'synthetic',
};
