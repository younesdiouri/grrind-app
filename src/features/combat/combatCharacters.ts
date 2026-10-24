import { enemyArtworkOf, type FighterArtwork } from './enemyPresentation.ts';
import type { Battle } from './timeline.ts';
import { QUATERNIUS_OPPONENT, type UnityAvatar } from './unityFrame.ts';

/** Même les anciens duels quittent les sprites ; le snapshot serveur reste intact. */
export function combatEnemy(enemy: Battle['enemy'], bundled: Readonly<Record<string, FighterArtwork>> = {}) {
  const human = Boolean(enemy.appearance);
  const model: UnityAvatar['model'] = !human && enemy.key === 'SAND_JACKAL' ? 'cailloux' : undefined;
  return {
    avatar: { ...QUATERNIUS_OPPONENT, model, visible: human || !!model },
    artwork: human || model ? undefined : enemyArtworkOf(enemy, bundled),
  };
}
