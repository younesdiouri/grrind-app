import { combatMotion } from '@/design/tokens';
import type { BattleBeat } from './timeline.ts';
import { beatAt } from './sampling.ts';

export type EnemyPose = 'idle' | 'attack' | 'hit';

/** Le même instant pilote le sprite, les dégâts, les PV et l'haptique. */
export function contactAt(beat: Pick<BattleBeat, 'at' | 'until'>): number {
  'worklet';
  return beat.at + Math.round((beat.until - beat.at) * combatMotion.contact);
}

export function enemyMotionAt(beats: BattleBeat[], time: number, reduced = false) {
  'worklet';
  const state = { pose: 'idle' as EnemyPose, x: 0, y: 0, scale: 1, rotate: 0, flash: 0 };
  const beat = beatAt(beats, time);
  if (!beat || beat.kind === 'verdict') return state;
  if (!reduced) state.y = Math.sin(time / combatMotion.breathPeriod * Math.PI * 2) * combatMotion.breath;
  if (beat.kind !== 'attack' && beat.kind !== 'dodge') return state;

  const contact = contactAt(beat);
  const recovery = beat.at + (beat.until - beat.at) * combatMotion.recover;
  const landed = time >= contact && time < recovery;
  // L'élan atteint son maximum au contact ; le retour prend le reste du battement.
  const force = time < contact
    ? (time - beat.at) / (contact - beat.at)
    : Math.max(0, 1 - (time - contact) / (recovery - contact));

  if (beat.attacker === 'ENEMY') {
    if (landed) state.pose = 'attack';
    if (!reduced) {
      state.y += force * combatMotion.lunge;
      state.scale += force * combatMotion.attackScale;
    }
  } else if (beat.kind === 'dodge') {
    if (!reduced) {
      state.x = force * combatMotion.dodge;
      state.rotate = force * combatMotion.tilt;
    }
  } else if (landed) {
    state.pose = 'hit';
    if (!reduced) {
      state.y -= force * combatMotion.recoil;
      state.scale -= force * combatMotion.recoilScale;
      state.flash = Math.max(0, 1 - (time - contact) / combatMotion.flashDuration);
    }
  }
  return state;
}
