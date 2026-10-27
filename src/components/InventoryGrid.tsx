import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ItemIllustration } from '@/components/ItemIllustration';
import { SystemFrame } from '@/components/SystemFrame';
import { color, control, frame, inventoryArt, opacity, rarityColor, rarityLabel, space, type, typography } from '@/design/tokens';
import { filterInventoryItems, INVENTORY_CATEGORIES, type Inventory, type InventoryCategory, type InventoryLine } from '@/features/inventory/inventory';

type GridProps = {
  items: InventoryLine[];
  equipment: Inventory['equipment'];
  selectedKey?: string | null;
  onSelect(key: string): void;
};

/** Les lignes gardent trois cases de même largeur, même sur une dernière rangée incomplète. */
export function InventoryGrid({ items, equipment, selectedKey, onSelect }: GridProps) {
  return <View style={styles.grid}>
    {Array.from({ length: Math.ceil(items.length / inventoryArt.columns) }, (_, row) => (
      <View key={row} style={styles.row}>
        {Array.from({ length: inventoryArt.columns }, (_, column) => {
          const item = items[row * inventoryArt.columns + column];
          if (!item) return <View key={column} style={styles.cell} />;
          const equipped = Object.values(equipment).some((line) => line?.key === item.key);
          const selected = selectedKey === item.key;
          const tint = rarityColor[item.rarity];
          return <Pressable key={item.key} testID={`inventory-item-${item.key}`} accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${rarityLabel[item.rarity]}, ${item.quantity} exemplaire${item.quantity === 1 ? '' : 's'}${equipped ? ', équipé' : ''}`}
            accessibilityHint="Ouvrir la fiche de l’objet" aria-selected={selected}
            onPress={() => onSelect(item.key)} style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
            <View style={[styles.art, { borderColor: selected ? color.accent : tint }]}>
              <ItemIllustration item={item} size={inventoryArt.iconSize} tint={tint} />
              {equipped && <View style={styles.equipped}><Text style={styles.check}>✓</Text></View>}
              <Text style={styles.quantity}>×{item.quantity}</Text>
              <View style={[styles.rarityBar, { backgroundColor: tint }]} />
            </View>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <Text style={[styles.rarity, { color: tint }]}>{rarityLabel[item.rarity]}</Text>
          </Pressable>;
        })}
      </View>
    ))}
  </View>;
}

export function InventoryBag(props: GridProps) {
  const [category, setCategory] = useState<InventoryCategory>('all');
  const items = filterInventoryItems(props.items, category);
  return <View style={styles.bag}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}
      accessibilityRole="tablist">
      {(Object.keys(INVENTORY_CATEGORIES) as InventoryCategory[]).map((key) => (
        <Pressable key={key} testID={`inventory-filter-${key}`} accessibilityRole="tab"
          aria-selected={category === key} onPress={() => setCategory(key)}
          style={({ pressed }) => [styles.filter, category === key && styles.filterActive, pressed && styles.pressed]}>
          <Text style={[styles.filterLabel, category === key && styles.filterLabelActive]}>{INVENTORY_CATEGORIES[key]}</Text>
        </Pressable>
      ))}
    </ScrollView>
    <Text style={styles.note}>Touche un objet pour voir sa fiche.</Text>
    {items.length > 0 ? <InventoryGrid {...props} items={items} /> : (
      <SystemFrame contentStyle={styles.empty}>
        <Text style={styles.emptyTitle}>{props.items.length === 0 ? 'Ton sac est vide' : 'Aucun objet dans cette catégorie'}</Text>
        <Text style={styles.note}>Tes prochains objets apparaîtront ici.</Text>
      </SystemFrame>
    )}
  </View>;
}

const styles = StyleSheet.create({
  bag: { gap: space.md },
  grid: { gap: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  cell: { flex: 1, minWidth: 0, gap: space.xs },
  art: { aspectRatio: 1, backgroundColor: color.surfaceRaised, borderWidth: frame.standard.borderWidth,
    borderRadius: frame.standard.radius, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { ...type.label, color: color.text, letterSpacing: 0, minHeight: inventoryArt.nameHeight,
    fontFamily: typography.display.semibold, fontWeight: typography.display.weight.semibold },
  rarity: { ...type.label, fontSize: inventoryArt.raritySize, letterSpacing: 0 },
  quantity: { ...type.label, position: 'absolute', bottom: space.xs, right: space.xs,
    color: color.text, backgroundColor: color.surface, paddingHorizontal: space.xs, borderRadius: control.radius },
  equipped: { position: 'absolute', top: 0, left: 0, width: inventoryArt.markerSize, height: inventoryArt.markerSize,
    backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  check: { ...type.label, color: color.background },
  rarityBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: frame.segmentThickness },
  filters: { gap: space.sm, paddingBottom: space.xs },
  filter: { minHeight: control.backSize, paddingHorizontal: space.md, justifyContent: 'center',
    backgroundColor: color.surface, borderWidth: control.borderWidth, borderColor: color.border, borderRadius: control.radius },
  filterActive: { borderColor: color.accent, backgroundColor: color.surfaceRaised },
  filterLabel: { ...type.label, color: color.textMuted, fontFamily: typography.display.semibold },
  filterLabelActive: { color: color.accent },
  note: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  empty: { padding: space.lg, gap: space.sm },
  emptyTitle: { ...type.body, color: color.text },
  pressed: { opacity: opacity.pressed },
});
