import type { ImageSource } from 'expo-image';
import type { components } from '@/api/schema';
import type { EnemyPose } from './enemyMotion';

export type EnemyArtwork = { name: string; introduction?: string; poses: Record<EnemyPose, ImageSource> };
type EnemyPresentation = Pick<components['schemas']['BattleEnemy'], 'name' | 'imageUrls'>;

/** Le contrat du combat est autonome, y compris au rejeu : aucune recherche dans le catalogue. */
export function enemyArtworkOf(enemy: EnemyPresentation): EnemyArtwork | undefined {
  const urls = enemy.imageUrls;
  if (!urls || ![urls.idle, urls.attack, urls.hit].every((url) => typeof url === 'string' && /^https?:\/\/\S+$/.test(url))) return undefined;
  return {
    name: enemy.name,
    poses: { idle: { uri: urls.idle }, attack: { uri: urls.attack }, hit: { uri: urls.hit } },
  };
}

/** Une illustration ne peut pas retenir indéfiniment un combat déjà livré. */
export const ENEMY_IMAGE_TIMEOUT_MS = 8_000;
