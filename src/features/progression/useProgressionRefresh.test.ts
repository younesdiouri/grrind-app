import assert from 'node:assert/strict';
import { mock, it } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { getProgressionRevision } from './weeklyRefresh.ts';

let state = 'active';
let onState: (state: string) => void = () => {};
let removed = false;
mock.module('react-native', { namedExports: { AppState: {
  get currentState() { return state; },
  addEventListener: (_event: string, listener: typeof onState) => {
    onState = listener;
    return { remove: () => { removed = true; } };
  },
} } });
const { watchProgressionRefresh } = await import('./useProgressionRefresh.ts');

it('invalide les lectures serveur à la frontière et au réveil sans effacer les possessions', () => {
  mock.timers.enable({ apis: ['Date', 'setTimeout'], now: Date.parse('2026-11-01T18:59:59Z') });
  const client = new QueryClient();
  const keys = [['inventory'], ['players', 'one'], ['alam', 'current'], ['guilds', 'mine']];
  for (const key of keys) client.setQueryData(key, { serverValue: 42 });
  client.setQueryData(['other'], 12);
  const initialRevision = getProgressionRevision();
  const stop = watchProgressionRefresh(client);
  try {
    mock.timers.tick(1000);
    assert.equal(getProgressionRevision(), initialRevision + 1);
    for (const key of keys) {
      assert.equal(client.getQueryState(key)?.isInvalidated, true);
      assert.deepEqual(client.getQueryData(key), { serverValue: 42 });
      client.setQueryData(key, { serverValue: 0 });
    }
    assert.equal(client.getQueryState(['other'])?.isInvalidated, false);
    state = 'background'; onState(state);
    mock.timers.tick(7 * 24 * 3600000);
    assert.equal(getProgressionRevision(), initialRevision + 1);
    state = 'active'; onState(state);
    assert.equal(getProgressionRevision(), initialRevision + 2);
    for (const key of keys) assert.equal(client.getQueryState(key)?.isInvalidated, true);
  } finally {
    stop(); client.clear(); mock.timers.reset();
  }
  assert.equal(removed, true);
});
