import { combatMotion } from '@/design/tokens';
import type { Actor, BattleBeat, Ramp } from './timeline.ts';
import { beatAt, sampleRamp } from './sampling.ts';

export type BaseFighterPose = 'idle' | 'attack' | 'hit';
export type SpecialFighterPose = 'critical' | 'dodge' | 'combo' | 'replay';
export type FighterPose = BaseFighterPose | SpecialFighterPose;
export type PoseSignals = Record<SpecialFighterPose, Ramp>;

/** Les rampes serveur allument les poses, sans changer le geste ni les dégâts. */
export function fighterPoseAt(base: BaseFighterPose, time: number, signals?: PoseSignals): FighterPose {
  'worklet';
  if (!signals) return base;
  for (const pose of ['dodge', 'critical', 'replay', 'combo'] as const) {
    if (pose === 'critical' && base !== 'attack') continue;
    if (sampleRamp(signals[pose], time) > 0) return pose;
  }
  return base;
}

/** Le même instant pilote les sprites, les dégâts, les PV, la caméra et l'haptique. */
export function contactAt(beat: Pick<BattleBeat, 'at' | 'until'>): number {
  'worklet';
  return beat.at + Math.round((beat.until - beat.at) * combatMotion.contact);
}

/**
 * Le geste d'un combattant à `time`, vu depuis **son** camp.
 *
 * L'ennemi tient le haut de la scène et le héros le bas : un élan va donc vers l'autre (`+y`
 * pour l'ennemi, `-y` pour le héros), un recul s'en éloigne. Le reste est symétrique.
 *
 * **L'arrêt sur le coup** : passé le contact, le geste se fige `hitStop` ms à son maximum avant
 * de revenir. Seul le corps s'arrête — l'éclat, les PV et l'haptique gardent l'instant du
 * contact, ce qui est précisément ce qui donne du poids au coup.
 */
export function fighterMotionAt(beats: BattleBeat[], self: Actor, time: number, reduced = false, lateral = false) {
  'worklet';
  const state = { pose: 'idle' as BaseFighterPose, x: 0, y: 0, scale: 1, rotate: 0, flash: 0 };
  const beat = beatAt(beats, time);
  if (!beat || beat.kind === 'verdict') return state;
  if (!reduced) state.y = Math.sin(time / combatMotion.breathPeriod * Math.PI * 2) * combatMotion.breath;
  if (beat.kind !== 'attack' && beat.kind !== 'dodge') return state;

  const toward = self === 'ENEMY' ? 1 : -1;
  const contact = contactAt(beat);
  const recovery = beat.at + (beat.until - beat.at) * combatMotion.recover;
  const landed = time >= contact && time < recovery;
  const held = time < contact ? time : Math.max(contact, time - combatMotion.hitStop);
  // L'élan atteint son maximum au contact ; le retour prend le reste du battement.
  const force = held < contact
    ? (held - beat.at) / (contact - beat.at)
    : Math.max(0, 1 - (held - contact) / (recovery - contact));

  if (beat.attacker === self) {
    if (landed) state.pose = 'attack';
    if (!reduced) {
      if (lateral) state.x -= toward * force * combatMotion.lunge;
      else state.y += toward * force * combatMotion.lunge;
      state.scale += force * combatMotion.attackScale;
    }
  } else if (beat.kind === 'dodge') {
    if (!reduced) {
      state.x = toward * force * combatMotion.dodge;
      state.rotate = toward * force * combatMotion.tilt;
    }
  } else if (landed) {
    state.pose = 'hit';
    if (!reduced) {
      if (lateral) state.x += toward * force * combatMotion.recoil;
      else state.y -= toward * force * combatMotion.recoil;
      state.scale -= force * combatMotion.recoilScale;
      state.flash = Math.max(0, 1 - (time - contact) / combatMotion.flashDuration);
    }
  }
  return state;
}
