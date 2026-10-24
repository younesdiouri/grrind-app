import { closeSync, existsSync, openSync, readSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_LOG_BYTES = 4 * 1024 * 1024;

function trimLogs(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) trimLogs(path);
    else if (entry.isFile() && entry.name.endsWith('.log') && statSync(path).size > MAX_LOG_BYTES) {
      const notice = Buffer.from('[GRRIND] Début du journal supprimé ; seuls les derniers 4 Mio sont conservés.\n');
      const tail = Buffer.alloc(MAX_LOG_BYTES - notice.length);
      const fd = openSync(path, 'r');
      try { readSync(fd, tail, 0, tail.length, statSync(path).size - tail.length); }
      finally { closeSync(fd); }
      writeFileSync(path, Buffer.concat([notice, tail]));
    }
  }
}

// Only dated report directories: dev state, fixtures and manually pinned proofs survive.
export function pruneReports(root, keep = 1) {
  if (!existsSync(root)) return 0;
  const runs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}_\d{6}$/.test(entry.name))
    .map((entry) => entry.name).sort().reverse();
  let removed = 0;
  for (const [index, name] of runs.entries()) {
    const path = resolve(root, name);
    if (existsSync(resolve(path, '.keep'))) continue;
    if (index >= keep) {
      rmSync(path, { recursive: true });
      removed += 1;
    } else trimLogs(path);
  }
  return removed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve('artifacts/e2e');
  const removed = pruneReports(root) + pruneReports(resolve(root, 'reset'), 1);
  console.log(`Rapports iOS : ${removed} anciens dossiers supprimés ; dernier run et dernier reset conservés, logs limités à 4 Mio ; état dev conservé.`);
}
