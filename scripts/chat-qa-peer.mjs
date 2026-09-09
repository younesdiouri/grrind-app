import { readFile, appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const qa = JSON.parse(await readFile('artifacts/e2e/chat-qa.json', 'utf8'));
if (!['localhost', '127.0.0.1'].includes(new URL(qa.base).hostname)) throw new Error('QA locale uniquement');
const login = await fetch(`${qa.base}/api/auth/login`, { method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: qa.founder.email, password: qa.password }),
});
if (!login.ok) throw new Error(`login ${login.status}`);
const { tokens } = await login.json();
const headers = { Authorization: `Bearer ${tokens.accessToken}`, 'Content-Type': 'application/json' };
if (process.argv[2] === '--exclude') {
  const response = await fetch(`${qa.base}/api/guilds/${qa.guildId}/members/${qa.viewer.user.id}`, { method: 'DELETE', headers });
  if (!response.ok) throw new Error(`exclude ${response.status}`);
}
const startedAt = new Date().toISOString();
const response = await fetch(`${qa.base}/api/guilds/${qa.guildId}/chat/messages`, {
  method: 'POST', headers, body: JSON.stringify({ clientId: randomUUID(), text: process.argv[2] === '--exclude' ? 'Après exclusion' : (process.argv[2] ?? 'Signal du partenaire') }),
});
if (!response.ok) throw new Error(`send ${response.status}`);
const message = await response.json();
const proof = { startedAt, receivedAt: new Date().toISOString(), id: message.id, cursor: message.cursor, text: message.text };
await appendFile('artifacts/e2e/chat-peer.jsonl', `${JSON.stringify(proof)}\n`);
console.log(proof);
