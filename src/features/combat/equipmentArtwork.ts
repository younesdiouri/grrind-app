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

/** Cadrage stable sur toutes les poses du même équipement, calculé hors de l’animation. */
export function equipmentFrameScale(attachments: Record<string, FighterAttachments> | undefined,
  equipment: EquipmentArtwork[]) {
  let reach = 0.5;
  for (const item of equipment) {
    const series = attachments?.[item.attachment];
    for (const pose of Object.keys(series ?? {}) as FighterPose[]) {
      const box = equipmentPlacement(series, pose, item, !!item.mirror)!;
      const angle = box.rotate * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
      const pivotX = box.left + box.width * box.pivotX, pivotY = box.top + box.height * box.pivotY;
      for (const x of [-box.width * box.pivotX, box.width * (1 - box.pivotX)]) {
        for (const y of [-box.height * box.pivotY, box.height * (1 - box.pivotY)]) {
          reach = Math.max(reach, Math.abs(pivotX + x * cos - y * sin - 0.5),
            Math.abs(pivotY + x * sin + y * cos - 0.5));
        }
      }
    }
  }
  return 0.5 / reach;
}
