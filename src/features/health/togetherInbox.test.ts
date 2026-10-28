import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTogetherInbox, type TogetherBonus } from './togetherInbox.ts';

test('le curseur avance après acquittement, résiste à la relance et isole les comptes', async () => {
  const cursors = new Map<string, string>();
  const queries: (string | null)[] = [];
  // Seul le port HTTP est simulé ; la file et ses acquittements sont ceux de production.
  const one = { id: 'one' } as TogetherBonus;
  const two = { id: 'two' } as TogetherBonus;
  const deps = { readCursor: async (owner: string) => cursors.get(owner) ?? null,
    writeCursor: async (owner: string, id: string) => { cursors.set(owner, id); },
    fetchPage: async (after: string | null) => {
      queries.push(after);
      return { bonuses: after === 'one' ? [two] : after === 'two' ? [] : [one, two], nextCursor: 'two', hasMore: false };
    } };
  const inbox = createTogetherInbox(deps);
  await Promise.all([inbox.load('a'), inbox.load('a')]);
  assert.equal(queries.length, 1);
  assert.equal(cursors.size, 0);
  const resumed = createTogetherInbox(deps);
  await resumed.load('a');
  assert.equal(resumed.getSnapshot().bonuses[0].id, 'one');
  await Promise.all([resumed.acknowledge('a', 'one'), resumed.acknowledge('a', 'one')]);
  const restarted = createTogetherInbox(deps);
  await restarted.load('a');
  assert.deepEqual(restarted.getSnapshot().bonuses.map((bonus) => bonus.id), ['two']);
  await restarted.load('b');
  assert.equal(restarted.getSnapshot().bonuses[0].id, 'one');
  await assert.rejects(restarted.acknowledge('a', 'one'));
});

test('une écriture de curseur refusée conserve le reçu et une réponse tardive ne traverse pas les comptes', async () => {
  let deliver!: (page: { bonuses: TogetherBonus[]; nextCursor: null; hasMore: false }) => void;
  const inbox = createTogetherInbox({ readCursor: async () => null, writeCursor: async () => { throw new Error('Keychain'); },
    fetchPage: () => new Promise((resolve) => { deliver = resolve; }) });
  const load = inbox.load('a');
  await Promise.resolve();
  inbox.bind('b');
  deliver({ bonuses: [{ id: 'late' } as TogetherBonus], nextCursor: null, hasMore: false });
  await load;
  assert.deepEqual(inbox.getSnapshot().bonuses, []);
  const broken = createTogetherInbox({ readCursor: async () => null,
    writeCursor: async () => { throw new Error('Keychain'); },
    fetchPage: async () => ({ bonuses: [{ id: 'one' } as TogetherBonus], nextCursor: 'one', hasMore: false }) });
  await broken.load('a');
  await assert.rejects(broken.acknowledge('a', 'one'));
  assert.equal(broken.getSnapshot().bonuses[0].id, 'one');
});

test('la pagination reprend au dernier reçu présenté, sans sauter une page ni repartir de zéro si le trousseau est muet', async () => {
  let cursor: string | null = null;
  const queries: (string | null)[] = [];
  const inbox = createTogetherInbox({ readCursor: async () => cursor,
    writeCursor: async (_, id) => { cursor = id; }, fetchPage: async (after) => {
      queries.push(after);
      return { bonuses: after ? [{ id: 'second' } as TogetherBonus] : [{ id: 'first' } as TogetherBonus],
        nextCursor: after ? 'second' : 'first', hasMore: !after };
    } });
  await inbox.load('a');
  inbox.markPresented('a', 'first');
  assert.equal(cursor, null);
  await inbox.load('a');
  assert.deepEqual(queries, [null]);
  await inbox.acknowledge('a', 'first');
  await inbox.load('a');
  assert.deepEqual(queries, [null, 'first']);
  assert.equal(inbox.getSnapshot().bonuses[0].id, 'second');
  const locked = createTogetherInbox({ readCursor: async () => { throw new Error('Keychain'); },
    writeCursor: async () => {}, fetchPage: async () => { throw new Error('Ne doit pas être appelé'); } });
  await locked.load('a');
  assert.equal(locked.getSnapshot().failed, true);
  assert.deepEqual(locked.getSnapshot().bonuses, []);
});
