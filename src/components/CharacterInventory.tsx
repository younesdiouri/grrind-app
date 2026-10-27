import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { CharacterStatistics } from '@/components/CharacterStatistics';
import { EquipmentBoard } from '@/components/EquipmentBoard';
import { ItemCard } from '@/components/ItemCard';
import { AvatarEntry } from '@/features/avatar/AvatarEntry';
import type { Avatar } from '@/features/combat/serverAvatar';
import { color, opacity, radius, space, type } from '@/design/tokens';

const sections = { equipment: 'Équipement', appearance: 'Apparence', bag: 'Sac', statistics: 'Statistiques' } as const;

/** Même feuille pour soi et les autres ; les gestes privés restent fournis par l'écran personnel. */
export function CharacterInventory({ inventory, statistics, equipment, bag, avatar, onAvatarPress, onAppearance }: {
  inventory: components['schemas']['PublicInventory'];
  statistics: components['schemas']['PlayerStatistics'];
  equipment?: ReactNode;
  bag?: ReactNode;
  avatar?: Avatar;
  onAvatarPress?(): void;
  onAppearance?(): void;
}) {
  const [section, setSection] = useState<Exclude<keyof typeof sections, 'appearance'>>('equipment');
  return (
    <View style={styles.content}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(Object.keys(sections) as (keyof typeof sections)[]).filter((key) => key !== 'appearance' || onAppearance).map((key) => (
          <Pressable key={key} testID={`character-tab-${key}`} accessibilityRole={key === 'appearance' ? 'button' : 'tab'}
            aria-selected={key === 'appearance' ? undefined : section === key}
            onPress={() => key === 'appearance' ? onAppearance?.() : setSection(key)}
            style={({ pressed }) => [styles.tab, section === key && styles.selected, pressed && styles.pressed]}>
            <Text style={[styles.label, section === key && styles.activeLabel]}>{sections[key]}</Text>
          </Pressable>
        ))}
      </View>
      {section === 'statistics' ? <CharacterStatistics statistics={statistics} /> : null}
      {section === 'equipment' ? equipment ?? (
        <>
          <EquipmentBoard equipment={inventory.equipment} avatar={<AvatarEntry avatar={avatar} equipment={inventory.equipment} onPress={onAvatarPress} />} />
          {Object.values(inventory.equipment).every((line) => line === null)
            ? <Text style={styles.note}>Aucun équipement porté.</Text>
            : Object.entries(inventory.equipment).map(([slot, line]) => line === null ? null : <ItemCard key={slot} item={line} equipped showRarity={false} />)}
        </>
      ) : null}
      {section === 'bag' ? bag ?? (
        inventory.items.length === 0 ? <Text style={styles.note}>Le sac est vide.</Text>
          : inventory.items.map((line) => <ItemCard key={line.key} item={line} quantity={line.quantity} showRarity={false}
            equipped={Object.values(inventory.equipment).some((equipped) => equipped?.key === line.key)} />)
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  tabs: { flexDirection: 'row', backgroundColor: color.surface, borderRadius: radius.sm, padding: space.xs },
  tab: { flex: 1, paddingVertical: space.md, alignItems: 'center', borderRadius: radius.sm },
  selected: { backgroundColor: color.surfaceRaised },
  label: { ...type.label, letterSpacing: 0, color: color.textMuted },
  activeLabel: { color: color.accent },
  note: { ...type.body, color: color.textMuted },
  pressed: { opacity: opacity.pressed },
});
