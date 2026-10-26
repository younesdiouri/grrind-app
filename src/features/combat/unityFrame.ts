import { combatMotion } from '@/design/tokens';
import { contactAt, fighterMotionAt, hitStopOf, type FighterPose, type PoseSignals } from './fighterMotion.ts';
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
  weapon?: 'ferPlay' | 'huilesson';
  weaponType?: components['schemas']['WeaponType'];
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
/** Unity-only posture (#279): the knock-out stays down until the verdict. */
const KNOCKED_OUT = 8;

/** Same server timeline and contact as the HUD; phase .5 is the contact in each clip. */
export function unityActorFrame(beats: BattleBeat[], side: Actor, time: number, signals: PoseSignals,
  width: number, visible: boolean, reduced: boolean, weaponType: UnityAvatar['weaponType'] = 'FIST'): UnityActorFrame {
  'worklet';
  const beat = beatAt(beats, time);
  const motion = fighterMotionAt(beats, side, time, reduced, true);
  const frame = { pose: 0, phase: reduced ? 0 : (Math.max(0, time) % 2500) / 2500,
    x: width > 0 ? motion.x / width : 0, visible, reduced };
  const knockout = beats.find((entry) => entry.kind === 'attack' && entry.final && entry.attacker !== side);
  // Compared by time, not identity: worklets receive copies of the beats.
  if (knockout && time >= contactAt(knockout) && (!beat || beat.at >= knockout.at)) {
    // Down from the knock-out to the verdict, falling in half a second once the hit-stop ends;
    // the finale then shows the winner alone.
    const fallen = Math.max(0, time - contactAt(knockout) - hitStopOf(knockout)) / 1000;
    return { ...frame, pose: KNOCKED_OUT, phase: reduced ? 1 : Math.min(1, .5 + fallen), x: 0 };
  }
  if (!beat || beat.kind === 'opening' || beat.kind === 'verdict') return frame;
  const span = beat.until - beat.at;
  if (beat.kind === 'combo') {
    if (beat.actor === side) { frame.pose = 5; frame.phase = (time - beat.at) / span; }
    return frame;
  }
  if (beat.attacker === side) frame.x = 0;
  const contact = contactAt(beat);
  const recovery = beat.at + span * combatMotion.recover;
  if (time >= recovery) { frame.x = 0; return frame; }
  const stop = hitStopOf(beat);
  const released = Math.max(contact, time - stop);
  if (beat.attacker === side) {
    const critical = sampleRamp(signals.critical, contact + (beat.until - contact) / 3) > 0;
    const replay = sampleRamp(signals.replay, beat.at + (contact - beat.at) / 3) > 0;
    frame.pose = critical ? 3 : replay ? 6 : 1;
    const prepared = (time - beat.at) / (contact - beat.at);
    frame.phase = time < contact ? (weaponType === 'SWORD' ? prepared : prepared ** 3) * .5
      : .5 + (released - contact) / (recovery - contact - stop) * .5;
  } else if (beat.kind === 'dodge') {
    frame.pose = 4; frame.phase = (time - beat.at) / (recovery - beat.at);
  } else if (time >= contact) {
    frame.pose = 2;
    // Reaction peak meets the fist and HUD at contact, then recovers into the boxing guard.
    frame.phase = .5 + (released - contact) / (recovery - contact - stop) * .5;
  }
  if (reduced && frame.pose !== 0) frame.phase = .5;
  return frame;
}
