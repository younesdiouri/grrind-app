import { combatMotion } from '@/design/tokens';
import { contactAt, fighterMotionAt, type FighterPose, type PoseSignals } from './fighterMotion.ts';
import { beatAt, sampleRamp } from './sampling.ts';
import type { Actor, BattleBeat } from './timeline.ts';
import type { components } from '@/api/schema';

export type UnityAvatar = Omit<components['schemas']['Avatar'], 'version'> & {
  model?: 'cailloux';
  boots: boolean; headband: boolean; visible: boolean;
  sportShirt?: boolean; shirtColor?: 'cyan' | 'coral';
  pantsColor?: 'base' | 'original' | 'violet' | 'cyan' | 'coral';
  boxingGloves?: boolean;
  dumbbell?: boolean;
};
// Isolated workshop/demo defaults; live snapshots are resolved by serverAvatar.
export const QUATERNIUS_AVATAR: UnityAvatar = { body: 'male', hairStyle: 'parted', boots: true, headband: false, visible: true,
  skinTone: 'tan', eyeColor: 'brown', hairColor: 'brown', sportShirt: true, shirtColor: 'cyan',
  pantsColor: 'violet', boxingGloves: true, faceStyle: 'original', noseStyle: 'original' };
export const QUATERNIUS_OPPONENT: UnityAvatar = { ...QUATERNIUS_AVATAR, body: 'female', hairStyle: 'buns',
  skinTone: 'deep', shirtColor: 'coral', pantsColor: 'cyan' };
export type UnityViewport = { x: number; y: number; width: number; height: number };
export type UnityActorFrame = { pose: number; phase: number; x: number; visible: boolean; reduced: boolean };
export type UnityInspectorProps = {
  avatar: UnityAvatar; pose: FighterPose; phase: number; animated: boolean;
  view: number; azimuth: number; viewport: UnityViewport; onReady(): void; onError(): void;
};
export const UNITY_POSES: Record<FighterPose, number> = { idle: 0, attack: 1, hit: 2, critical: 3, dodge: 4, combo: 5, replay: 6 };

/** Same server timeline and contact as the HUD; phase .5 is the contact in each clip. */
export function unityActorFrame(beats: BattleBeat[], side: Actor, time: number, signals: PoseSignals,
  width: number, visible: boolean, reduced: boolean): UnityActorFrame {
  'worklet';
  const beat = beatAt(beats, time);
  const motion = fighterMotionAt(beats, side, time, reduced, true);
  const frame = { pose: 0, phase: reduced ? 0 : (Math.max(0, time) % 2500) / 2500,
    x: width > 0 ? motion.x / width : 0, visible, reduced };
  if (!beat || beat.kind === 'opening' || beat.kind === 'verdict') return frame;
  const span = beat.until - beat.at;
  if (beat.kind === 'combo') {
    if (beat.actor === side) { frame.pose = 5; frame.phase = (time - beat.at) / span; }
    return frame;
  }
  const contact = contactAt(beat);
  const recovery = beat.at + span * combatMotion.recover;
  if (time >= recovery) { frame.x = 0; return frame; }
  const released = Math.max(contact, time - combatMotion.hitStop);
  if (beat.attacker === side) {
    const critical = sampleRamp(signals.critical, contact + (beat.until - contact) / 3) > 0;
    const replay = sampleRamp(signals.replay, beat.at + (contact - beat.at) / 3) > 0;
    frame.pose = critical ? 3 : replay ? 6 : 1;
    frame.phase = time < contact ? ((time - beat.at) / (contact - beat.at)) ** 3 * .5
      : .5 + (released - contact) / (recovery - contact - combatMotion.hitStop) * .5;
  } else if (beat.kind === 'dodge') {
    frame.pose = 4; frame.phase = (time - beat.at) / (recovery - beat.at);
  } else if (time >= contact) {
    frame.pose = 2;
    // Reaction peak meets the fist and HUD at contact, then recovers into the boxing guard.
    frame.phase = .5 + (released - contact) / (recovery - contact - combatMotion.hitStop) * .5;
  }
  if (reduced && frame.pose !== 0) frame.phase = .5;
  return frame;
}
