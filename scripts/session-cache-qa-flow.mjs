import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Même entrée privée que la QA back ; aucun secret dans Git ou les arguments Maestro.
const file = process.env.SESSION_CACHE_QA_CREDENTIALS;
if (!file) throw new Error('SESSION_CACHE_QA_CREDENTIALS doit désigner les deux comptes QA locaux.');
const { A, B, baseUrl, toxiproxyControlUrl } = JSON.parse(readFileSync(file, 'utf8'));
if (![baseUrl, toxiproxyControlUrl].every(value => new URL(value).hostname === '127.0.0.1')
  || !A.email.includes('-empty-') || !B.email.includes('-empty-') || A.id === B.id
  || A.expectedItemKeys.length === 0 || B.expectedItemKeys.length !== 0) {
  throw new Error('La QA exige deux comptes empty distincts, un sac A rempli, un sac B vide et des services loopback.');
}
const result = spawnSync('rtk', ['proxy', 'npm', 'run', 'e2e:ios:flow', '--', '.maestro/session-cache.yaml'], {
  stdio: 'inherit', env: {
    ...process.env, E2E_OFFLINE: '0', E2E_EXISTING_ACCOUNTS: '1', E2E_API_URL: baseUrl,
    MAESTRO_CACHE_PROXY_CONTROL: toxiproxyControlUrl,
    MAESTRO_CACHE_A_EMAIL: A.email, MAESTRO_CACHE_A_PASSWORD: A.password, MAESTRO_CACHE_A_GUILD: A.guildName,
    MAESTRO_CACHE_A_ITEM_KEY: A.expectedItemKeys[0], MAESTRO_CACHE_A_ITEM_NAME: A.expectedItemNames[0],
    MAESTRO_CACHE_B_EMAIL: B.email, MAESTRO_CACHE_B_PASSWORD: B.password, MAESTRO_CACHE_B_GUILD: B.guildName,
  },
});
process.exitCode = result.status ?? 1;
