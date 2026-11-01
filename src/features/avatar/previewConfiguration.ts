import { serverAvatar } from '@/features/combat/serverAvatar';
import type { UnityAvatar } from '@/features/combat/unityFrame';
import { leagueArt } from '@/design/tokens';

export type PreviewFraming = 'full' | 'portrait';

export function previewConfiguration(avatar: UnityAvatar, size: { width: number; height: number }, framing: PreviewFraming = 'full') {
  // Only cosmetic fields reach the head capture, even if a caller supplies an equipped model.
  const { body, faceStyle, noseStyle, skinTone, eyeColor, hairStyle, hairColor } = avatar;
  const player = framing === 'portrait'
    ? serverAvatar({ version: 1, body, faceStyle, noseStyle, skinTone, eyeColor, hairStyle, hairColor }) : avatar;
  return { player, enemy: { ...player, visible: false }, inspection: true,
    view: framing === 'portrait' ? 1 : 0, azimuth: framing === 'portrait' ? 0 : 25,
    previewWidth: Math.round(size.width * (framing === 'portrait' ? leagueArt.headCaptureScale : 2)),
    previewHeight: Math.round(size.height * (framing === 'portrait' ? leagueArt.headCaptureScale : 2)) };
}
