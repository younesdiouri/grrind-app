import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createChatController, type ChatDeps } from './chatController.ts';
import type { ChatMessage, ChatPage, ChatResult } from './chatState.ts';

const message = (cursor: string): ChatMessage => ({ id: cursor, cursor, clientId: cursor,
  authorId: 'a', text: cursor, createdAt: '', imageUrl: null });
const ok = <T>(data: T): ChatResult<T> => ({ ok: true, data });
const deps = (overrides: Partial<ChatDeps> = {}): ChatDeps => ({
  history: async () => ok({ messages: [], nextCursor: null }),
  send: async () => ok(message('1')),
  removePhoto: () => {}, onGone: () => {}, now: () => 0,
  ...overrides,
});

test('rattrape toutes les pages et ne fait pas avancer le curseur avec une page vide', async () => {
  const queries: unknown[] = [];
  const controller = createChatController(deps({ history: async (query) => {
    queries.push(query);
    if (!query.after) return ok({ messages: [message('3'), message('2')], nextCursor: '2' });
    if (query.after === '3') return ok({ messages: [message('4')], nextCursor: '4' });
    return ok({ messages: [message('5')], nextCursor: null });
  } }));
  await controller.load();
  await controller.catchUp();
  assert.deepEqual(controller.getState().messages.map((m) => m.id), ['2', '3', '4', '5']);
  assert.deepEqual(queries, [{ limit: 50 }, { after: '3', limit: 50 }, { after: '4', limit: 50 }]);
});

test('une réponse tardive après purge ne repeuple jamais la conversation', async () => {
  let resolve!: (result: ChatResult<ChatPage>) => void;
  const controller = createChatController(deps({ history: () => new Promise((r) => { resolve = r; }) }));
  const pending = controller.load();
  controller.dispose();
  resolve(ok({ messages: [message('1')] }));
  await pending;
  assert.deepEqual(controller.getState().messages, []);
});

test('réessayer conserve le clientId et la photo préparée, purge après succès', async () => {
  const sent: unknown[] = [];
  const removed: string[] = [];
  const controller = createChatController(deps({
    send: async (draft) => {
      sent.push(draft);
      return sent.length === 1 ? { ok: false, error: { failure: { kind: 'offline' }, retryAt: 0 } } : ok(message('1'));
    },
    removePhoto: (photo) => removed.push(photo.uri),
  }));
  controller.setDraft({ clientId: 'fixed', text: 'bonjour', photo: { uri: 'prepared.jpg' } });
  await controller.send();
  await controller.send();
  assert.equal(sent[0], sent[1]);
  assert.deepEqual(removed, ['prepared.jpg']);
  assert.equal(controller.getState().draft, null);
});

test('un refus de guilde purge le brouillon et ferme son périmètre', async () => {
  let gone = 0;
  const removed: string[] = [];
  const controller = createChatController(deps({
    history: async () => ({ ok: false, error: { retryAt: 0, failure: { kind: 'problem', problem: {
      type: 'https://grrind.app/problems/guild-not-found', title: '', detail: '', status: 404,
    } } } }),
    removePhoto: (photo) => removed.push(photo.uri), onGone: () => gone++,
  }));
  controller.setDraft({ clientId: 'fixed', text: '', photo: { uri: 'private.jpg' } });
  await controller.load();
  assert.equal(gone, 1);
  assert.deepEqual(removed, ['private.jpg']);
  assert.equal(controller.getState().draft, null);
});
