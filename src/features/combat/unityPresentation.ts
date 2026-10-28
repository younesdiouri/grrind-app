import { combatMotion } from '@/design/tokens';
import { cameraAt, impactAt } from './camera.ts';
import { beatAt, sampleRamp } from './sampling.ts';
import type { BattleTimeline, SideRamps } from './timeline.ts';

/** Values sampled from the shared clock; Unity never simulates damage or rewards. */
export function unityPresentationAt(timeline: BattleTimeline, time: number, skipped: boolean, reduced = false) {
  'worklet';
  const verdict = timeline.beats[timeline.beats.length - 1];
  const finished = time >= verdict.at;
  const beat = beatAt(timeline.beats, time);
  const impact = !finished && !skipped ? impactAt(timeline.impacts, time) : undefined;
  const elapsed = impact ? time - impact.at : combatMotion.sparkLife;
  const progress = Math.min(1, Math.max(0, elapsed / combatMotion.sparkLife));
  const camera = cameraAt(finished || skipped ? [] : timeline.impacts, time, reduced);
  const sideAt = (side: SideRamps, target: 'PLAYER' | 'ENEMY') => {
    const damageOpacity = !finished && !skipped ? Math.min(1, sampleRamp(side.damageFlash, time) * 4) : 0;
    const critical = sampleRamp(side.criticalFlash, time) > 0;
    const effects = [
      ['ESQUIVE', side.dodgeFlash], ['CRITIQUE !', side.criticalFlash],
      ['COMBO', side.comboFlash], ['ENCHAÎNE !', side.replayFlash], ['GARDE', side.guardFlash],
    ] as const;
    let effect = '';
    let effectOpacity = 0;
    if (!finished && !skipped) {
      for (const [label, ramp] of effects) {
        const lit = sampleRamp(ramp, time);
        if (lit > 0) { effect = label; effectOpacity = Math.min(1, lit * 4); break; }
      }
    }
    return {
      hp: Math.round(sampleRamp(side.hp, time)),
      trailHp: sampleRamp(side.hp, Math.max(0, time - (reduced ? 0 : 320))),
      damage: Math.round(sampleRamp(side.damage, time)), damageOpacity,
      rise: reduced ? 0 : sampleRamp(side.rise, time), critical, effect, effectOpacity,
      impact: !reduced && impact?.target === target && progress < 1 ? impact.strength : 0,
      impactProgress: progress,
    };
  };
  return {
    time: Math.max(0, time) / 1000,
    opening: beat?.kind === 'opening' && !skipped ? Math.max(0, (time - beat.at) / (beat.until - beat.at)) : -1,
    player: sideAt(timeline.player, 'PLAYER'), enemy: sideAt(timeline.enemy, 'ENEMY'),
    active: beat?.kind === 'attack' || beat?.kind === 'dodge' ? (beat.attacker === 'PLAYER' ? 1 : 2)
      : beat?.kind === 'combo' ? (beat.actor === 'PLAYER' ? 1 : 2) : 0,
    finished, reduced,
    finale: finished ? Math.min(1, (time - verdict.at) / (verdict.until - verdict.at)) : 0,
    shakeX: camera.x, shakeY: camera.y, zoom: camera.scale,
  };
}
