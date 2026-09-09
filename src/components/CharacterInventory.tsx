import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { CharacterStatistics } from '@/components/CharacterStatistics';
import { EquipmentBoard } from '@/components/EquipmentBoard';
import { ItemCard } from '@/components/ItemCard';
import { color, opacity, radius, space, type } from '@/design/tokens';

const sections = { equipment: 'Équipement', statistics: 'Statistiques', bag: 'Sac' } as const;

/** Même feuille pour soi et les autres ; les gestes privés restent fournis par l'écran personnel. */
export function CharacterInventory({ inventory, statistics, equipment, bag }: {
  inventory: components['schemas']['PublicInventory'];
  statistics: components['schemas']['PlayerStatistics'];
  equipment?: ReactNode;
  bag?: ReactNode;
}) {
  const [section, setSection] = useState<keyof typeof sections>('equipment');
  return (
    <View style={styles.content}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(Object.keys(sections) as (keyof typeof sections)[]).map((key) => (
          <Pressable key={key} testID={`character-tab-${key}`} accessibilityRole="tab"
            accessibilityState={{ selected: section === key }} onPress={() => setSection(key)}
            style={({ pressed }) => [styles.tab, section === key && styles.selected, pressed && styles.pressed]}>
            <Text style={[styles.label, section === key && styles.activeLabel]}>{sections[key]}</Text>
          </Pressable>
        ))}
      </View>
      {section === 'statistics' ? <CharacterStatistics statistics={statistics} /> : null}
      {section === 'equipment' ? equipment ?? (
        <>
          <EquipmentBoard equipment={inventory.equipment} />
          {Object.values(inventory.equipment).every((line) => line === null)
            ? <Text style={styles.note}>Aucun équipement porté.</Text>
            : Object.entries(inventory.equipment).map(([slot, line]) => line === null ? null : <ItemCard key={slot} item={line} equipped />)}
        </>
      ) : null}
      {section === 'bag' ? bag ?? (
        inventory.items.length === 0 ? <Text style={styles.note}>Le sac est vide.</Text>
          : inventory.items.map((line) => <ItemCard key={line.key} item={line} quantity={line.quantity}
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
