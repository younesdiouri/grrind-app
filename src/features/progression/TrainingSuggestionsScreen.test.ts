import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import { TRAINING_NOW, TRAINING_WEEK } from './weekTrainingFixtures.ts';

const navigation: string[] = [];
let reads = 0;
mock.module('expo-router', { namedExports: {
  Stack: { Screen: () => null },
  router: { push: (path: string) => navigation.push(path), back: () => navigation.push('back') },
} });
mock.module(new URL('./useWeekTrainingPlan.ts', import.meta.url), { namedExports: {
  useWeekTrainingPlan: () => ({ data: TRAINING_WEEK, now: TRAINING_NOW, isPending: false, isFetching: false,
    error: null, refetch: () => { reads++; } }),
} });
const { default: Screen } = await import('../../app/(app)/conseils-sportifs.tsx');

it('relie le vrai écran à la route du guide, au retour et au retry', () => {
  const view = Screen().props.children[1].props.children;
  assert.deepEqual(view.props.week, TRAINING_WEEK);
  assert.equal(view.props.now, TRAINING_NOW);
  view.props.onGuide();
  view.props.onBack();
  view.props.onRetry();
  assert.deepEqual(navigation, ['/sports', 'back']);
  assert.equal(reads, 1);
});
