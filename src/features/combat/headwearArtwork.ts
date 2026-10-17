import type { EquipmentArtwork } from './equipmentArtwork';

/** Un seul calque, partagé entre toutes les stances ; ce bandeau sans texte accepte le miroir. */
const band: EquipmentArtwork = {
  key: 'TEMPERED_HEADBAND:v1',
  source: require('../../../assets/images/items/tempered-headband/v1/layer.png'),
  aspectRatio: 512 / 186,
  scale: 1,
  pivot: { x: 0.5, y: 0.5 },
  plane: 'front',
};
export const MURID_HEADBAND: Record<'back' | 'front', EquipmentArtwork> = {
  back: band,
  front: { ...band, mirror: true },
};
