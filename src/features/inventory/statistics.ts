import type { components } from '@/api/schema';

export type Fighter = components['schemas']['BattleFighter'];

/** La ventilation vient du serveur, y compris quand un plafond sépare total et somme. */
export function attributeDetail(stat: components['schemas']['AttributeStatistic']): string {
  return `${stat.base} de base · ${stat.equipmentBonus >= 0 ? '+' : ''}${stat.equipmentBonus} équipement`;
}

export function combatValue(key: keyof Fighter, value: number): string {
  return key === 'hp' || key === 'damage' ? String(value) : `${value} %`;
}
