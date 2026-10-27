import type { components } from '@/api/schema';
import { equippedModels } from './equippedAvatarPreview.ts';
import type { UnityAvatar } from './unityFrame.ts';

export type Avatar = components['schemas']['Avatar'];
export const DEFAULT_AVATAR: Avatar = { version: 1, body: 'male', faceStyle: 'original', noseStyle: 'wide',
  hairStyle: 'parted', skinTone: 'tan', eyeColor: 'brown', hairColor: 'brown' };
export type AvatarEquipment = components['schemas']['BattleEquipment'] | components['schemas']['PublicInventory']['equipment'];

/** The caller supplies the snapshot for battles/replays, the saved profile for inspection. */
export function serverAvatar(avatar: Avatar | null | undefined, equipment: AvatarEquipment = {}): UnityAvatar {
  const appearance = avatar?.version === 1 ? avatar : DEFAULT_AVATAR;
  const { shirt, pants, weapon, headband } = equippedModels(equipment);
  return { ...appearance, visible: true, headband,
    shirtColor: shirt === 'coral' ? 'coral' : shirt === 'slate' ? 'cyan' : 'base',
    pantsColor: pants === 'original' ? 'base' : pants, boxingGloves: weapon === 'gloves',
    dumbbell: weapon === 'dumbbell' || weapon === 'ego',
    weapon: weapon === 'ferPlay' || weapon === 'huilesson' ? weapon : undefined,
    weaponType: equipment.WEAPON?.weaponType ?? 'FIST' };
}
