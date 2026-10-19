import { combatMotion } from '@/design/tokens';
import { contactAt, fighterMotionAt, type FighterPose, type PoseSignals } from './fighterMotion.ts';
import { beatAt, sampleRamp } from './sampling.ts';
import type { Actor, BattleBeat } from './timeline.ts';
import type { components } from '@/api/schema';

export type UnityAvatar = { body: 'male' | 'female'; skin: string; weapon: boolean; glasses: boolean; boots?: boolean; visible: boolean };
export type UnityViewport = { x: number; y: number; width: number; height: number };
export type UnityActorFrame = { pose: number; phase: number; x: number; visible: boolean };
export type UnityInspectorProps = {
  avatar: UnityAvatar; pose: FighterPose; phase: number; animated: boolean;
  view: number; azimuth: number; viewport: UnityViewport; onReady(): void; onError(): void;
};
export const UNITY_POSES: Record<FighterPose, number> = { idle: 0, attack: 1, hit: 2, critical: 3, dodge: 4, combo: 5, replay: 6 };

export function unityAvatarOf(fighter: { appearance?: string | null; equipment?: components['schemas']['BattleEquipment'] }): UnityAvatar {
  const items = Object.values(fighter.equipment ?? {});
  return { body: fighter.appearance === 'RUNNER_V3' || fighter.appearance === 'SWIMMER_V3' ? 'female' : 'male',
    skin: '#DBB894', weapon: items.some((item) => item.key === 'HALTER_EGO'),
    glasses: items.some((item) => item.key === 'PURSUIT_GOGGLES'), visible: true };
}

/** Same server timeline and contact as the HUD; phase .5 is the contact in each clip. */
export function unityActorFrame(beats: BattleBeat[], side: Actor, time: number, signals: PoseSignals,
  width: number, visible: boolean, reduced: boolean): UnityActorFrame {
  'worklet';
  const beat = beatAt(beats, time);
  const motion = fighterMotionAt(beats, side, time, reduced, true);
  const frame = { pose: 0, phase: reduced ? 0 : (Math.max(0, time) % 2500) / 2500,
    x: width > 0 ? motion.x / width : 0, visible };
  if (!beat || beat.kind === 'opening' || beat.kind === 'verdict') return frame;
  const span = beat.until - beat.at;
  if (beat.kind === 'combo') {
    if (beat.actor === side) { frame.pose = 5; frame.phase = (time - beat.at) / span; }
    return frame;
  }
  const contact = contactAt(beat);
  if (beat.attacker === side) {
    const critical = sampleRamp(signals.critical, contact + (beat.until - contact) / 3) > 0;
    const replay = sampleRamp(signals.replay, beat.at + (contact - beat.at) / 3) > 0;
    frame.pose = critical ? 3 : replay ? 6 : 1;
    frame.phase = time < contact ? (time - beat.at) / (contact - beat.at) * .5
      : .5 + (time - contact) / (beat.until - contact) * .5;
  } else if (beat.kind === 'dodge') {
    frame.pose = 4; frame.phase = (time - beat.at) / span;
  } else if (time >= contact && time < beat.at + span * combatMotion.recover) {
    frame.pose = 2; frame.phase = (time - contact) / (beat.until - contact);
  }
  if (reduced && frame.pose !== 0) frame.phase = .5;
  return frame;
}
