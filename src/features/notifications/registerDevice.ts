import { api } from '@/api/client';
import type { components } from '@/api/schema';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import type { DeviceEnvironment, DevicePlatform } from '@/features/notifications/deviceEnvironment';

export type Device = components['schemas']['Device'];

export type RegisterDeviceOutcome = { ok: true; device: Device } | { ok: false; failure: Failure };

/**
 * `POST /api/devices` — un upsert par construction : que ce soit le tout premier
 * enregistrement de ce téléphone ou un réenregistrement, la route rend la même forme, et rien
 * ici n'a besoin de savoir lequel c'était. Elle change le propriétaire du jeton si un autre
 * compte l'a enregistré avant — c'est le comportement voulu, pas une erreur à porter.
 *
 * Le jeton n'apparaît jamais dans la réponse (`Device` ne le porte pas), donc rien à en faire
 * ici non plus.
 */
export async function registerDevice(input: {
  pushToken: string;
  platform: DevicePlatform;
  environment: DeviceEnvironment;
}): Promise<RegisterDeviceOutcome> {
  try {
    const { data, error } = await api.POST('/api/devices', { body: input });

    if (data === undefined) {
      return { ok: false, failure: failureFrom(error) };
    }

    return { ok: true, device: data };
  } catch {
    return { ok: false, failure: OFFLINE };
  }
}
