import type { ImageSource } from 'expo-image';
import type { components } from '@/api/schema';
import type { BaseFighterPose, SpecialFighterPose } from './fighterMotion';

export type FighterArtwork = { name: string; introduction?: string;
  poses: Record<BaseFighterPose, ImageSource> & Partial<Record<SpecialFighterPose, ImageSource>> };
type EnemyPresentation = Pick<components['schemas']['BattleEnemy'], 'name' | 'imageUrls'>
  & Partial<Pick<components['schemas']['BattleEnemy'], 'key' | 'introduction'>>;

/** Le contrat du combat est autonome, y compris au rejeu : aucune recherche dans le catalogue. */
export function enemyArtworkOf(enemy: EnemyPresentation, bundled: Readonly<Record<string, FighterArtwork>> = {}): FighterArtwork | undefined {
  const local = enemy.key ? bundled[enemy.key] : undefined;
  if (local) return { ...local, name: enemy.name, introduction: enemy.introduction ?? undefined };
  const urls = enemy.imageUrls;
  if (!urls || ![urls.idle, urls.attack, urls.hit].every((url) => typeof url === 'string' && /^https?:\/\/\S+$/.test(url))) return undefined;
  const extras: Partial<Record<SpecialFighterPose, ImageSource>> = {};
  for (const pose of ['critical', 'dodge', 'combo', 'replay'] as const) {
    const url = (urls as Partial<Record<SpecialFighterPose, string>>)[pose];
    if (typeof url === 'string' && /^https?:\/\/\S+$/.test(url)) extras[pose] = { uri: url };
  }
  return {
    name: enemy.name,
    poses: { idle: { uri: urls.idle }, attack: { uri: urls.attack }, hit: { uri: urls.hit }, ...extras },
  };
}

/** Une illustration ne peut pas retenir indéfiniment un combat déjà livré. */
export const ENEMY_IMAGE_TIMEOUT_MS = 8_000;
