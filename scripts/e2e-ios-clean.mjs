import { readdirSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Only dated report directories: dev state, fixtures and manually pinned proofs survive.
export function pruneReports(root, keep = 5) {
  if (!existsSync(root)) return 0;
  const runs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d{6}$/.test(entry.name))
    .map((entry) => entry.name).sort().reverse();
  let removed = 0;
  for (const name of runs.slice(keep)) {
    const path = resolve(root, name);
    if (existsSync(resolve(path, '.keep'))) continue;
    rmSync(path, { recursive: true });
    removed += 1;
  }
  return removed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve('artifacts/e2e');
  const removed = pruneReports(root) + pruneReports(resolve(root, 'reset'), 1);
  console.log(`Rapports iOS : ${removed} anciens dossiers supprimés ; état dev conservé.`);
}
