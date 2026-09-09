import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Uniquement des comptes jetables via l'API publique ; aucune migration ni accès à la base.
const base = process.env.E2E_API_URL ?? 'http://localhost:8080';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('QA locale uniquement');
const stamp = Date.now();
const password = 'e2e-password-assez-long';
async function request(path, token, body, method = 'POST') {
  const response = await fetch(`${base}${path}`, {
    method, headers: { 'Content-Type': 'application/json', 'Accept-Language': 'fr',
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}
async function account(label) {
  const email = `grrind-chat-empty-${label}-${stamp}@example.test`;
  const session = await request('/api/auth/register', null, {
    email, password, displayName: `QA ${label}`, timezone: 'Europe/Paris', locale: 'fr',
  });
  return { email, user: session.user, accessToken: session.tokens.accessToken };
}
const founder = await account('Fondateur');
const author = await account('Partenaire');
const viewer = await account('Chat');
const guild = await request('/api/guilds', founder.accessToken, { name: 'QA Chat privé' });
const invite = await request(`/api/guilds/${guild.id}/invite-code`, founder.accessToken);
for (const member of [author, viewer]) await request('/api/guilds/join', member.accessToken, { code: invite.code });
for (let i = 1; i <= 55; i++) {
  await request(`/api/guilds/${guild.id}/chat/messages`, (i % 2 ? founder : author).accessToken,
    { clientId: randomUUID(), text: `Historique ${String(i).padStart(2, '0')}` });
}
await request('/api/guilds/mine/leave', author.accessToken);
await mkdir('artifacts/e2e', { recursive: true });
await writeFile('artifacts/e2e/chat-qa.json', JSON.stringify({
  guildId: guild.id, founder, viewer, password, base,
  env: { MAESTRO_CHAT_EMAIL: viewer.email, MAESTRO_CHAT_PASSWORD: password },
}, null, 2), { mode: 0o600 });
console.log('55 messages réels préparés, dont un ancien membre. Comptes dans artifacts/e2e/chat-qa.json (ignoré).');
