import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

import type { paths } from '@/api/schema';
import { isCurrentOwner, type SessionOwner } from '@/features/auth/session';

type ImportBody = paths['/api/workouts/import']['post']['requestBody']['content']['application/json'];
export type ImportIntent = { key: string; body: ImportBody };

/** Même stockage privé que les reçus : un corps de 200 séances ne tient pas au Keychain.
 * L'ancienne clé globale sans propriétaire ni corps reste intacte ; elle ne prouve aucun lot.
 */
function file(owner: SessionOwner): File {
  if (!isCurrentOwner(owner)) throw new Error('Import d’une session quittée');
  return new File(Paths.document, `pending-import-${encodeURIComponent(owner.id)}.json`);
}

export function readImport(owner: SessionOwner): ImportIntent | null {
  const handle = file(owner);
  if (!handle.exists) return null;
  const value = JSON.parse(handle.textSync()) as Partial<ImportIntent> | null;
  if (!value || typeof value.key !== 'string' || !value.key ||
      !Array.isArray(value.body?.workouts) || value.body.workouts.length === 0 ||
      !value.body.workouts.every((w) => w && typeof w.source === 'string' &&
        typeof w.externalId === 'string' && typeof w.activityType === 'string' &&
        typeof w.startedAt === 'string' && typeof w.endedAt === 'string')) {
    // Échouer fermé : ne jamais remplacer une intention incertaine par un nouveau lot.
    throw new Error('Intention d’import illisible');
  }
  return value as ImportIntent;
}

export function prepareImport(owner: SessionOwner, body: ImportBody): ImportIntent {
  const held = readImport(owner);
  if (held) return held;
  const raw = JSON.stringify({ key: Crypto.randomUUID(), body });
  const handle = file(owner);
  const next = new File(`${handle.uri}.next`);
  next.write(raw);
  next.move(handle);
  // Le corps envoyé est exactement la copie sérialisée, indépendante du fournisseur.
  return JSON.parse(raw) as ImportIntent;
}

export function forgetImport(owner: SessionOwner, intent: ImportIntent): void {
  if (readImport(owner)?.key === intent.key) file(owner).delete();
}
