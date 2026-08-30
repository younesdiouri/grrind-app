import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMockHealthProvider } from '@/features/health/mockHealth';

const NOW = new Date('2026-08-30T12:00:00.000Z');

describe('le fournisseur santé E2E', () => {
  it('rend un scénario vide sans prétendre que Santé est indisponible', async () => {
    const provider = createMockHealthProvider({ scenario: () => 'empty', now: () => NOW });

    assert.equal(await provider.isAvailable(), true);
    assert.equal(await provider.authorizationPrompt(), 'alreadyAsked');
    assert.deepEqual(await provider.workoutsSince(new Date('2026-08-01T00:00:00.000Z')), []);
  });

  it('rend les séances récentes dans un ordre et avec des mesures stables', async () => {
    const provider = createMockHealthProvider({ scenario: () => 'multiple', now: () => NOW });
    const workouts = await provider.workoutsSince(new Date('2026-08-01T00:00:00.000Z'));

    assert.deepEqual(
      workouts.map((entry) => entry.externalId),
      ['grrind-e2e-cycling', 'grrind-e2e-strength', 'grrind-e2e-run'],
    );
    assert.equal(workouts[0].distanceMeters, 18_400);
    assert.equal(workouts[1].distanceMeters, null);
    assert.equal(workouts[2].averageHeartRate, 154);
  });

  it('respecte la fenêtre demandée et garde les dates reproductibles', async () => {
    const provider = createMockHealthProvider({ scenario: () => 'multiple', now: () => NOW });
    const workouts = await provider.workoutsSince(new Date('2026-08-29T07:15:00.000Z'));

    assert.equal(workouts.length, 1);
    assert.equal(workouts[0].externalId, 'grrind-e2e-run');
    assert.equal(workouts[0].startedAt, '2026-08-29T07:00:00.000Z');
  });
});
