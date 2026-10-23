import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mock, test } from 'node:test';

const require = createRequire(import.meta.url);
const requests: Request[] = [];
mock.module(require.resolve('expo/fetch'), { namedExports: {
  fetch: async (url: string, init: RequestInit) => {
    const request = new Request(url, init);
    requests.push(request);
    const params = new URL(request.url).searchParams;
    if (params.has('topic') || !params.has('match')) return new Response(null, { status: 400 });
    return new Response('data: {"type":"chat.changed"}\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  },
} });
const { connectChatStream } = await import('./chatStream.ts');

test('reçoit les signaux privés avec le matcher moderne sans exposer le jeton dans l’URL', async () => {
  const subscription = {
    url: 'https://hub.test/.well-known/mercure',
    topic: 'https://grrind.app/guilds/qa/chat?channel=privé&scope=members',
    token: 'private-token', expiresAt: '2026-10-23T12:00:00Z',
  };
  let opened = false;
  let signals = 0;
  await new Promise<void>((resolve) => {
    connectChatStream(subscription, () => signals++, () => { opened = true; }, resolve);
  });
  assert.equal(opened, true);
  assert.equal(signals, 1);
  assert.equal(requests.length, 1);
  assert.deepEqual([...new URL(requests[0].url).searchParams], [['match', subscription.topic]]);
  assert.equal(requests[0].headers.get('Authorization'), `Bearer ${subscription.token}`);
  assert.equal(requests[0].headers.get('Accept'), 'text/event-stream');
});
