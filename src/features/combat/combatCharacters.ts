import { enemyArtworkOf, type FighterArtwork } from './enemyPresentation.ts';
import type { Battle } from './timeline.ts';
import { QUATERNIUS_OPPONENT, type UnityAvatar } from './unityFrame.ts';
import { serverAvatar } from './serverAvatar.ts';

export function combatPlayer(player: Battle['player']) {
  return serverAvatar(player.avatar, player.equipment);
}

/** Même les anciens duels quittent les sprites ; le snapshot serveur reste intact. */
export function combatEnemy(enemy: Battle['enemy'], bundled: Readonly<Record<string, FighterArtwork>> = {}) {
  const human = Boolean(enemy.playerId || enemy.avatar || enemy.appearance);
  const model: UnityAvatar['model'] = !human && enemy.key === 'SAND_JACKAL' ? 'cailloux' : undefined;
  return {
    avatar: human ? serverAvatar(enemy.avatar, enemy.equipment) : { ...QUATERNIUS_OPPONENT, model, visible: !!model },
    artwork: human || model ? undefined : enemyArtworkOf(enemy, bundled),
  };
}
