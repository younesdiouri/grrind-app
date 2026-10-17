import type { ImageSource } from 'expo-image';
import type { FighterPose } from './fighterMotion';

export type Attachment = { x: number; y: number; span: number; rotate: number };
export type FighterAttachments = Partial<Record<FighterPose, Attachment>>;
export type EquipmentArtwork = {
  key: string;
  attachment: string;
  source: ImageSource;
  aspectRatio: number;
  scale: number;
  pivot: { x: number; y: number };
  mirror?: boolean;
  plane: 'behind' | 'front';
};

/** Le pivot appartient à l’objet ; les ancrages appartiennent au personnage, réutilisables entre items. */
export function equipmentPlacement(anchors: FighterAttachments | undefined, pose: FighterPose,
  item: Pick<EquipmentArtwork, 'aspectRatio' | 'scale' | 'pivot'>, mirror: boolean) {
  'worklet';
  const anchor = anchors?.[pose];
  if (!anchor) return null;
  const width = anchor.span * item.scale;
  const height = width / item.aspectRatio;
  const pivotX = mirror ? 1 - item.pivot.x : item.pivot.x;
  return { left: anchor.x - width * pivotX, top: anchor.y - height * item.pivot.y,
    width, height, pivotX, pivotY: item.pivot.y, rotate: anchor.rotate };
}
