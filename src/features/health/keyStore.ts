import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

import type { paths } from '@/api/schema';
import { isCurrentOwner, type SessionOwner } from '@/features/auth/session';

type ImportBody = paths['/api/workouts/import']['post']['requestBody']['content']['application/json'];
type Batch = { key: string; body: ImportBody };
export type ImportIntent = Batch & { remaining?: Batch[] };

/** Même stockage privé que les reçus : un corps de 200 séances ne tient pas au Keychain.
 * L'ancienne clé globale sans propriétaire ni corps reste intacte ; elle ne prouve aucun lot.
 */
function file(owner: SessionOwner): File {
  if (!isCurrentOwner(owner)) throw new Error('Import d’une session quittée');
  return new File(Paths.document, `pending-import-${encodeURIComponent(owner.id)}.json`);
}

export function readImport(owner: SessionOwner): ImportIntent | null {
  let handle = file(owner);
  if (!handle.exists) handle = new File(`${handle.uri}.previous`);
  if (!handle.exists) return null;
  const value = JSON.parse(handle.textSync()) as ImportIntent;
  if (!isBatch(value) ||
      (value.remaining !== undefined && (!Array.isArray(value.remaining) || !value.remaining.every(isBatch)))) {
    // Échouer fermé : ne jamais remplacer une intention incertaine par un nouveau lot.
    throw new Error('Intention d’import illisible');
  }
  return value;
}

function isBatch(value: Batch | null): value is Batch {
  return value !== null && typeof value === 'object' && typeof value.key === 'string' && !!value.key &&
      Array.isArray(value.body?.workouts) && value.body.workouts.length > 0 &&
      value.body.workouts.every((w) => w && typeof w.source === 'string' &&
        typeof w.externalId === 'string' && typeof w.activityType === 'string' &&
        typeof w.startedAt === 'string' && typeof w.endedAt === 'string');
}

/** Même remplacement protégé que les reçus, pour ne jamais perdre la suite du plan. */
function persist(owner: SessionOwner, intent: ImportIntent): void {
  const handle = file(owner);
  const previous = new File(`${handle.uri}.previous`);
  const next = new File(`${handle.uri}.next`);
  next.write(JSON.stringify(intent));
  if (handle.exists) {
    if (previous.exists) previous.delete();
    handle.move(previous);
  }
  next.move(file(owner));
  try { if (previous.exists) previous.delete(); } catch { /* Le plan courant est durable. */ }
}

export function prepareImport(owner: SessionOwner, bodies: ImportBody[]): ImportIntent {
  const held = readImport(owner);
  if (held) return held;
  const [current, ...remaining] = bodies.map((body) => ({ key: Crypto.randomUUID(), body }));
  if (!current) throw new Error('Plan d’import vide');
  const intent = JSON.parse(JSON.stringify({ ...current, remaining })) as ImportIntent;
  persist(owner, intent);
  // La collection entière et toutes ses clés sont durables avant le premier transport.
  return intent;
}

export function forgetImport(owner: SessionOwner, intent: ImportIntent): void {
  const held = readImport(owner);
  if (held?.key !== intent.key) return;
  const [next, ...remaining] = held.remaining ?? [];
  if (next) {
    persist(owner, { ...next, remaining });
  } else {
    const handle = file(owner);
    const previous = new File(`${handle.uri}.previous`);
    if (previous.exists) previous.delete();
    if (handle.exists) handle.delete();
  }
}
