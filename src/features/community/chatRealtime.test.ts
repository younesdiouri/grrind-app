import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createChatRealtime, createChatSignalParser } from './chatRealtime.ts';

test('lit les signaux fragmentés, ignore les commentaires et données étrangères', () => {
  let signals = 0;
  const parse = createChatSignalParser(() => signals++);
  parse(': heartbeat\n\ndata: {"type":"chat.');
  parse('changed"}\r\n\r\ndata: {"type":"other"}\n\n');
  assert.equal(signals, 1);
});

test('renouvelle avant expiration, ferme au repos et ignore un ancien abonnement', async () => {
  const timers: { callback: () => void; delay: number; cancelled: boolean }[] = [];
  let tokens = 0;
  let closes = 0;
  let catches = 0;
  const realtime = createChatRealtime({
    subscription: async () => { tokens++; return { ok: true, data: { url: 'https://hub.test', topic: 'guild', token: 'private', expiresAt: new Date(300_000).toISOString() } }; },
    connect: (_sub, _changed, opened) => { opened(); return () => closes++; },
    catchUp: async () => { catches++; }, onError: () => {}, onStatus: () => {}, now: () => 0,
    schedule: (callback, delay) => { const timer = { callback, delay, cancelled: false }; timers.push(timer); return () => { timer.cancelled = true; }; },
  });
  realtime.setActive(true);
  await Promise.resolve();
  assert.ok(timers.some((timer) => timer.delay === 270_000));
  assert.equal(tokens, 1);
  assert.equal(catches, 2);
  realtime.setActive(false);
  assert.equal(closes, 1);
  assert.ok(timers.every((timer) => timer.cancelled));
  realtime.setActive(true);
  realtime.dispose();
  await Promise.resolve();
  assert.equal(closes, 1);
});

test('Retry-After retarde aussi le retour actif sans bloquer le rattrapage HTTP', async () => {
  const timers: number[] = [];
  let requests = 0;
  let catches = 0;
  const realtime = createChatRealtime({
    subscription: async () => { requests++; return { ok: false, error: { failure: { kind: 'offline' }, retryAt: 120_000 } }; },
    connect: () => () => {}, catchUp: async () => { catches++; },
    onError: () => {}, onStatus: () => {}, now: () => 0,
    schedule: (_callback, delay) => { timers.push(delay); return () => {}; },
  });
  realtime.setActive(true);
  await Promise.resolve();
  realtime.setActive(false);
  realtime.setActive(true);
  await Promise.resolve();
  assert.equal(requests, 1);
  assert.equal(catches, 2);
  assert.ok(timers.includes(120_000));
  realtime.dispose();
});
