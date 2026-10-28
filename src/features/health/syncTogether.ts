import type { components } from '@/api/schema';
import { API_BASE_URL } from '@/api/config';
import { getState, getAccessToken, refresh } from '@/features/auth/session';
import { healthProvider } from '@/features/health/current';
import { isE2eBuild } from '@/features/health/e2e';
import { sendPrivateEvidence } from '@/features/health/privateEvidence';
import { sportNative } from '@/features/health/sportNative';
import { togetherInbox } from '@/features/health/togetherBonuses';
import type { SyncTrigger } from '@/features/health/syncCoordinator';
import { getPending } from '@/features/reward/pending';

type Template = Omit<components['schemas']['LocationEvidenceRequest'], 'points' | 'batchId'>;
const runs = new Map<string, Promise<void>>();

export function syncTogether(trigger: SyncTrigger): Promise<void> {
  const auth = getState();
  if (auth.status !== 'signedIn') return Promise.resolve();
  const owner = auth.user.id;
  const presentAfterImport = trigger === 'manual' || getPending() !== null;
  const pending = runs.get(owner);
  if (pending) return pending;
  const current = () => { const state = getState(); return state.status === 'signedIn' && state.user.id === owner; };
  const run = (async () => {
    try {
      // Aucun réveil GPS ou demande de permission depuis cette synchronisation.
      if (__DEV__ && !isE2eBuild && sportNative && typeof sportNative.prepareSportUploads === 'function'
        && (await sportNative.sportStatus()).uploads?.enabled) {
        const native = sportNative;
        const workouts = await healthProvider.workoutsSince(new Date(Date.now() - 30 * 86400_000));
        const specifications: { nativeOrigin: 'route' | 'phone'; template: Template }[] = [];
        for (const workout of workouts) {
          if (!current()) return;
          await native.collectSportRoutes(workout.externalId).catch(() => undefined);
          const { source, externalId, startedAt, endedAt } = workout;
          specifications.push({ nativeOrigin: 'route', template: { source, externalId, startedAt, endedAt, origin: 'WORKOUT_ROUTE' } },
            { nativeOrigin: 'phone', template: { source, externalId, startedAt, endedAt, origin: 'PHONE_CAPTURE' } });
          if (specifications.length === 100) {
            if (!current()) return;
            await native.prepareSportUploads(owner, JSON.stringify(specifications));
            specifications.length = 0;
          }
        }
        if (!current()) return;
        if (specifications.length > 0) await native.prepareSportUploads(owner, JSON.stringify(specifications));
        await sendPrivateEvidence({ current, token: getAccessToken, refresh,
          send: (token) => native.uploadNextSportEvidence(owner, `${API_BASE_URL}/api/workouts/location-evidence`, token) });
      }
    } catch {
      // La file native reste intacte : l'XP solo et son résumé ne dépendent pas des preuves.
    } finally {
      if (current()) await togetherInbox.load(owner, presentAfterImport);
    }
  })().finally(() => { runs.delete(owner); });
  runs.set(owner, run);
  return run;
}
