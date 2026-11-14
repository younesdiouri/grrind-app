import type { components } from '@/api/schema';

/** Données de présentation et de tests ; jamais utilisées par le client réseau. */
export const SPORTS_CATALOG: components['schemas']['SportCatalog'] = {
  rulesetVersion: 'preview', revision: 1,
  reference: { durationSeconds: 1800, unit: 'XP' },
  disciplines: [
    {
      discipline: 'RACKET_SPORTS', name: 'Sports de raquette', aliases: ['EXERCISE_TYPE_TENNIS', 'tennis'],
      providerMappings: [{ source: 'APPLE_HEALTH', activityType: 'tennis', sport: 'tennis' }],
      creditsXp: true, attributePercentages: { strength: 10, endurance: 25, mobility: 10, dexterity: 55 },
      baseXp: 30, baseAttributeGains: { strength: 3, endurance: 8, mobility: 3, dexterity: 16 }, dailyCapXp: 120,
    },
    {
      discipline: 'STRENGTH', name: 'Musculation', aliases: ['traditionalStrengthTraining'],
      providerMappings: [{ source: 'APPLE_HEALTH', activityType: 'traditionalStrengthTraining', sport: null }],
      creditsXp: true, attributePercentages: { strength: 70, endurance: 20, mobility: 5, dexterity: 5 },
      baseXp: 30, baseAttributeGains: { strength: 21, endurance: 6, mobility: 2, dexterity: 1 }, dailyCapXp: 120,
    },
    {
      discipline: 'WALKING', name: 'Marche', aliases: ['walking'],
      providerMappings: [{ source: 'APPLE_HEALTH', activityType: 'walking', sport: 'walking' }],
      creditsXp: false, attributePercentages: null, baseXp: 0, baseAttributeGains: null, dailyCapXp: null,
    },
  ],
};
