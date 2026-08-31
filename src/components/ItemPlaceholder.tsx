import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { color, radius, type EquipmentSlot } from '@/design/tokens';

type ItemPlaceholderProps = {
  slot: EquipmentSlot;
  size?: number;
  tint?: string;
};

/** Une vignette provisoire par famille d'objet, remplaçable par l'illustration du catalogue. */
export function ItemPlaceholder({
  slot,
  size = 56,
  tint = color.textMuted,
}: ItemPlaceholderProps) {
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <Svg width={size * 0.64} height={size * 0.64} viewBox="0 0 24 24">
        <SlotGlyph slot={slot} tint={tint} />
      </Svg>
    </View>
  );
}

function SlotGlyph({ slot, tint }: { slot: EquipmentSlot; tint: string }) {
  const common = {
    fill: 'none',
    stroke: tint,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };

  switch (slot) {
    case 'HEAD':
      return <Path {...common} d="M5 14a7 7 0 0 1 14 0v4H5v-4Zm3-1h8M12 6v7" />;
    case 'CHEST':
      return <Path {...common} d="m8 5 4 2 4-2 3 4-2 10H7L5 9l3-4Zm4 2v12" />;
    case 'HANDS':
      return <Path {...common} d="M8 11V6a1.2 1.2 0 0 1 2.4 0v4-5a1.2 1.2 0 0 1 2.4 0v5-4a1.2 1.2 0 0 1 2.4 0v5l1-1a1.5 1.5 0 0 1 2 2.2l-4.2 6H9.5L6 14a2 2 0 0 1 2-3Z" />;
    case 'LEGS':
      return <Path {...common} d="M7 4h10l1 7-3 9h-3l-1-8-1 8H7l-1-9 1-7Zm4 0v8" />;
    case 'FEET':
      return <Path {...common} d="M5 7h5v7l4 2v3H5V7Zm10 3h4v6l2 1v2h-7v-3" />;
    case 'ACCESSORY':
      return (
        <>
          <Circle {...common} cx="12" cy="12" r="7" />
          <Path {...common} d="m12 8 3 4-3 4-3-4 3-4Z" />
        </>
      );
    case 'WEAPON':
      return <Path {...common} d="m6 18 9-9m-1-4 5-1-1 5-9 9-3 1 1-3-2-2 2-2 2 2" />;
  }
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.sm,
  },
});
