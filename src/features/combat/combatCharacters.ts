import { enemyArtworkOf, type FighterArtwork } from './enemyPresentation.ts';
import type { Battle } from './timeline.ts';
import { QUATERNIUS_OPPONENT } from './unityFrame.ts';

/** Même les anciens duels quittent les sprites ; le snapshot serveur reste intact. */
export function combatEnemy(enemy: Battle['enemy'], bundled: Readonly<Record<string, FighterArtwork>> = {}) {
  const human = Boolean(enemy.appearance);
  return {
    avatar: { ...QUATERNIUS_OPPONENT, visible: human },
    artwork: human ? undefined : enemyArtworkOf(enemy, bundled),
  };
}
