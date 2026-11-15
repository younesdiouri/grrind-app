import type { components } from '@/api/schema';
import { palette, type Attribute } from '@/design/tokens';

export type Emblem = components['schemas']['Guild']['emblem'];
export type EmblemColor = Emblem['backgroundColor'];

export const DEFAULT_GUILD_EMBLEM: Emblem = { symbol: 'DUMBBELL', backgroundColor: 'NIGHT', symbolColor: 'CYAN' };

export const emblemSymbols: Record<Emblem['symbol'], { label: string; attribute: Attribute }> = {
  DUMBBELL: { label: 'Musculation', attribute: 'strength' },
  HEART: { label: 'Cardio', attribute: 'endurance' },
  YOGA: { label: 'Yoga', attribute: 'mobility' },
  BOLT: { label: 'Explosivité', attribute: 'dexterity' },
};

export const emblemColors: Record<EmblemColor, { label: string; value: string }> = {
  NIGHT: { label: 'Nuit', value: palette.night },
  CHALK: { label: 'Blanc', value: palette.chalk },
  CYAN: { label: 'Cyan', value: palette.ember },
  MINT: { label: 'Menthe', value: palette.mint },
  AMETHYST: { label: 'Améthyste', value: palette.amethyst },
  GLACIER: { label: 'Glacier', value: palette.glacier },
  BLOSSOM: { label: 'Rose', value: palette.blossom },
  COPPER: { label: 'Cuivre', value: palette.copper },
};

/** Le contrat impose un ton nuit et un ton clair ; changer le fond conserve une paire lisible. */
export function emblemWithBackground(emblem: Emblem, backgroundColor: EmblemColor): Emblem {
  return { ...emblem, backgroundColor,
    symbolColor: backgroundColor === 'NIGHT'
      ? emblem.symbolColor === 'NIGHT' ? emblem.backgroundColor : emblem.symbolColor
      : 'NIGHT' };
}

export function sameEmblem(a: Emblem, b: Emblem): boolean {
  return a.symbol === b.symbol && a.backgroundColor === b.backgroundColor && a.symbolColor === b.symbolColor;
}
