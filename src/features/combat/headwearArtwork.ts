import type { EquipmentArtwork } from './equipmentArtwork';
import type { components } from '@/api/schema';

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

/** Une référence de combat seulement : aucune lecture du sac ou du profil courant au rejeu. */
export function headwearArtwork(fighter: { appearance?: components['schemas']['Appearance'] | null;
  equipment?: components['schemas']['BattleEquipment'] }, view: 'back' | 'front') {
  const head = fighter.equipment?.HEAD;
  return fighter.appearance === 'MURID' && head?.key === 'TEMPERED_HEADBAND' && head.artworkVersion === 'v1'
    ? MURID_HEADBAND[view] : undefined;
}
