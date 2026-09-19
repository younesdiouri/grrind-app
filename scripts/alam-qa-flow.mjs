import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Les identifiants de QA restent hors dépôt et hors ligne de commande Maestro.
const file = process.env.ALAM_QA_CREDENTIALS;
if (!file) throw new Error('ALAM_QA_CREDENTIALS doit désigner le fichier local créé par le backend.');
const { accounts } = JSON.parse(readFileSync(file, 'utf8'));
const account = accounts[0];
const result = spawnSync('rtk', ['proxy', 'npm', 'run', 'e2e:ios:flow', '--', process.argv[2] ?? '.maestro/alam-real.yaml'], {
  stdio: 'inherit', env: { ...process.env, E2E_OFFLINE: '1', MAESTRO_ALAM_EMAIL: account.email, MAESTRO_ALAM_PASSWORD: account.password },
});
process.exitCode = result.status ?? 1;
