// Deux co-équipiers jetables, pour le smoke du défi PvP (younesdiouri/grrind-back#283).
//
// Uniquement des comptes créés par l'API publique — ni migration, ni accès à la base. La
// guilde compte **deux membres présents** : le flow a besoin de voir une ligne de membre
// autre que soi, puis d'ouvrir son profil. C'est la seule chose qui distingue ce jeu de
// données de celui du chat, où le partenaire quitte la guilde à la fin.
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.E2E_API_URL ?? 'http://localhost:8080';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('QA locale uniquement');

const stamp = Date.now();
const password = 'e2e-password-assez-long';

async function request(path, token, body, method = 'POST') {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'fr',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function account(label) {
  const email = `grrind-duel-empty-${label}-${stamp}@example.test`;
  const session = await request('/api/auth/register', null, {
    email, password, displayName: `QA ${label}`, timezone: 'Europe/Paris', locale: 'fr',
  });
  return { email, user: session.user, accessToken: session.tokens.accessToken };
}

// Deux pseudos sans préfixe commun : une ligne de membre se désigne par son nom dans le
// flow, et « QA Defie » serait aussi un préfixe de « QA Defieur ».
const challenger = await account('Hote');
const opponent = await account('Rival');
const guild = await request('/api/guilds', challenger.accessToken, { name: 'QA Défis' });
const invite = await request(`/api/guilds/${guild.id}/invite-code`, challenger.accessToken);
await request('/api/guilds/join', opponent.accessToken, { code: invite.code });

await mkdir('artifacts/e2e', { recursive: true });
await writeFile('artifacts/e2e/duel-qa.json', JSON.stringify({
  guildId: guild.id, challenger, opponent, password, base,
  env: { MAESTRO_DUEL_EMAIL: challenger.email, MAESTRO_DUEL_PASSWORD: password },
}, null, 2), { mode: 0o600 });

console.log(`Guilde « QA Défis » prête : ${challenger.email} peut défier QA Rival.`);
