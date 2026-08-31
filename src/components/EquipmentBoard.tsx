import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ItemPlaceholder } from '@/components/ItemPlaceholder';
import {
  color,
  equipmentSlotLabel,
  opacity,
  radius,
  rarityColor,
  space,
  type,
  type EquipmentSlot,
} from '@/design/tokens';
import type { Inventory } from '@/features/inventory/inventory';

type EquipmentBoardProps = {
  equipment: Inventory['equipment'];
  selected: EquipmentSlot;
  onSelect: (slot: EquipmentSlot) => void;
};

const placement: Record<EquipmentSlot, ViewStyle> = {
  HEAD: { top: 0, left: '50%', marginLeft: -38 },
  ACCESSORY: { top: 70, left: 0 },
  CHEST: { top: 100, left: '50%', marginLeft: -38 },
  HANDS: { top: 170, left: 0 },
  WEAPON: { top: 170, right: 0 },
  LEGS: { top: 280, left: 0 },
  FEET: { top: 350, right: 0 },
};

/**
 * La doublure du combattant : le corps donne la carte, les sept cases donnent le geste.
 *
 * La silhouette est volontairement un mannequin articulé, pas un personnage final. Elle
 * restera juste quand les illustrations d'objets remplaceront les placeholders, et les cases
 * gardent une cible tactile confortable sans prétendre que le dessin lui-même est le bouton.
 */
export function EquipmentBoard({ equipment, selected, onSelect }: EquipmentBoardProps) {
  return (
    <View style={styles.board}>
      <View style={styles.silhouette}>
        <Svg width="100%" height="100%" viewBox="0 0 180 350">
          <Circle cx="90" cy="29" r="21" fill={color.surfaceRaised} stroke={color.border} strokeWidth="2" />
          <Line x1="90" y1="51" x2="90" y2="177" stroke={color.border} strokeWidth="4" strokeLinecap="round" />
          <Line x1="48" y1="78" x2="132" y2="78" stroke={color.border} strokeWidth="4" strokeLinecap="round" />
          <Line x1="49" y1="79" x2="25" y2="174" stroke={color.border} strokeWidth="4" strokeLinecap="round" />
          <Line x1="131" y1="79" x2="155" y2="174" stroke={color.border} strokeWidth="4" strokeLinecap="round" />
          <Path d="M61 87Q90 108 119 87M58 106Q90 128 122 106M62 126Q90 145 118 126" fill="none" stroke={color.border} strokeWidth="3" strokeLinecap="round" />
          <Path d="M68 165Q90 180 112 165L108 195H72Z" fill={color.surfaceRaised} stroke={color.border} strokeWidth="2" strokeLinejoin="round" />
          <Line x1="80" y1="194" x2="63" y2="285" stroke={color.border} strokeWidth="5" strokeLinecap="round" />
          <Line x1="100" y1="194" x2="117" y2="285" stroke={color.border} strokeWidth="5" strokeLinecap="round" />
          <Line x1="63" y1="285" x2="50" y2="330" stroke={color.border} strokeWidth="5" strokeLinecap="round" />
          <Line x1="117" y1="285" x2="130" y2="330" stroke={color.border} strokeWidth="5" strokeLinecap="round" />
          <Circle cx="25" cy="174" r="5" fill={color.surfaceRaised} stroke={color.border} strokeWidth="2" />
          <Circle cx="155" cy="174" r="5" fill={color.surfaceRaised} stroke={color.border} strokeWidth="2" />
          <Circle cx="63" cy="285" r="5" fill={color.surfaceRaised} stroke={color.border} strokeWidth="2" />
          <Circle cx="117" cy="285" r="5" fill={color.surfaceRaised} stroke={color.border} strokeWidth="2" />
        </Svg>
      </View>

      {(Object.keys(placement) as EquipmentSlot[]).map((slot) => {
        const line = equipment[slot];
        const active = selected === slot;
        const tint = line === null ? color.textMuted : rarityColor[line.rarity];

        return (
          <Pressable
            key={slot}
            accessibilityRole="button"
            accessibilityLabel={`${equipmentSlotLabel[slot]}, ${line?.name ?? 'vide'}`}
            accessibilityHint="Afficher les objets compatibles"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(slot)}
            style={({ pressed }) => [
              styles.slot,
              placement[slot],
              { borderColor: active ? color.accent : tint },
              active && styles.slotActive,
              pressed && styles.pressed,
            ]}
          >
            <ItemPlaceholder kind="EQUIPMENT" slot={slot} size={40} tint={tint} />
            <Text
              style={[styles.slotLabel, active && styles.slotLabelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {equipmentSlotLabel[slot].toUpperCase()}
            </Text>
            <View style={[styles.status, { backgroundColor: line === null ? color.border : tint }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    height: 430,
    position: 'relative',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  silhouette: {
    position: 'absolute',
    top: space.xl,
    bottom: space.xl,
    left: '50%',
    width: 180,
    marginLeft: -90,
    opacity: 0.72,
  },
  slot: {
    position: 'absolute',
    width: 76,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.xs,
  },
  slotActive: { borderWidth: 2 },
  slotLabel: { ...type.label, color: color.textMuted, fontSize: 10, letterSpacing: 0.2 },
  slotLabelActive: { color: color.text },
  status: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  pressed: { opacity: opacity.pressed },
});
