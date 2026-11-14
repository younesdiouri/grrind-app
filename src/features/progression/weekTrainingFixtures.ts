import type { components } from '@/api/schema';

export const TRAINING_NOW = new Date('2026-11-14T12:00:00Z');
export const TRAINING_PLAN: components['schemas']['WeekTrainingPlan'] = {
  remaining: { strength: 0, endurance: 0, mobility: 15, dexterity: 18 },
  remainingAfter: { strength: 0, endurance: 0, mobility: 0, dexterity: 0 },
  completesWeek: true, calculatedAt: '2026-11-14T12:00:00Z', expiresAt: '2026-11-14T23:00:00Z', rulesetVersion: 'preview',
  sessions: [
    { discipline: 'MOBILITY', durationSeconds: 1200, estimatedXp: 20, estimatedGains: { strength: 1, endurance: 3, mobility: 15, dexterity: 1 } },
    { discipline: 'CLIMBING', durationSeconds: 1800, estimatedXp: 30, estimatedGains: { strength: 8, endurance: 2, mobility: 3, dexterity: 17 } },
  ],
};

export const TRAINING_WEEK: components['schemas']['WeekProgress'] = {
  startsAt: '2026-11-08T23:00:00Z', resetsAt: '2026-11-15T23:00:00Z',
  current: { xp: 100, sessions: 2, attributes: { strength: 40, endurance: 60, mobility: 0, dexterity: 0 } },
  previous: { xp: 100, sessions: 3, attributes: { strength: 20, endurance: 47, mobility: 15, dexterity: 18 } },
  entries: [], trainingPlan: TRAINING_PLAN,
  trainingPlans: [TRAINING_PLAN, {
    ...TRAINING_PLAN, completesWeek: false,
    remainingAfter: { strength: 0, endurance: 0, mobility: 0, dexterity: 12 },
    sessions: [{ discipline: 'RACKET_SPORTS', durationSeconds: 2100, estimatedXp: 47,
      estimatedGains: { strength: 11, endurance: 13, mobility: 17, dexterity: 6 } }],
  }, {
    ...TRAINING_PLAN, completesWeek: false,
    remainingAfter: { strength: 0, endurance: 0, mobility: 6, dexterity: 2 },
    sessions: [{ discipline: 'SWIMMING', durationSeconds: 2400, estimatedXp: 41,
      estimatedGains: { strength: 4, endurance: 12, mobility: 9, dexterity: 16 } }],
  }],
};
