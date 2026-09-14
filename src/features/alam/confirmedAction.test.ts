import assert from 'node:assert/strict';
import { it } from 'node:test';
import { createActionKeys } from '../shop/actionKeys.ts';
import { createConfirmedAction } from './confirmedAction.ts';

it('garde une clé après coupure et double appui, puis renouvelle après un verdict', async () => {
  let disk: Record<string, string> = {};
  let minted = 0;
  const keys = createActionKeys({ read: async () => disk, write: async (value) => { disk = value; }, mint: () => String(++minted) });
  const seen: string[] = [];
  let online = false;
  const run = createConfirmedAction(keys, async (_intent: string, key: string) => {
    seen.push(key);
    if (!online) throw new Error('offline');
    return { data: 'resolved' };
  });
  await Promise.all([run('player:guild'), run('player:guild')]);
  online = true;
  assert.deepEqual(await run('player:guild'), { kind: 'done', data: 'resolved' });
  await run('player:guild');
  assert.deepEqual(seen, ['1', '1', '2']);
});

it('ne lance aucun POST si la clé ne peut pas être persistée', async () => {
  const run = createConfirmedAction({ keyFor: async () => { throw new Error('keychain'); }, forget: async () => undefined }, async () => { throw new Error('POST interdit'); });
  assert.deepEqual(await run('intent'), { kind: 'refused', failure: { kind: 'offline' } });
});
