import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ItemCard } from '@/components/ItemCard';
import { color, space, type, type EquipmentSlot } from '@/design/tokens';
import { isEquippable, type EquippableInventoryLine, type InventoryLine } from '@/features/inventory/inventory';

export function InventoryItemDetails({ item, equipped, blocked, busy, onEquip, onUnequip, onSell, onOpenChest, onCraft }: {
  item: InventoryLine;
  equipped: boolean;
  blocked: boolean;
  busy: boolean;
  onEquip(item: EquippableInventoryLine): void;
  onUnequip(slot: EquipmentSlot): void;
  onSell(item: InventoryLine): void;
  onOpenChest(key: string): void;
  onCraft(): void;
}) {
  return <View style={styles.content}>
    <ItemCard item={item} quantity={item.quantity} equipped={equipped} expanded showRarity={false} />
    {isEquippable(item) && <>
      {equipped
        ? <Button label="Retirer" accessibilityLabel={`Retirer — ${item.name}`} busy={busy} disabled={blocked}
          onPress={() => onUnequip(item.slot)} />
        : <Button label="Équiper" accessibilityLabel={`Équiper — ${item.name}`} busy={busy} disabled={blocked}
          onPress={() => onEquip(item)} />}
      {!equipped || item.quantity > 1
        ? <Button label={`Vendre · ${item.sellPriceCoins} pièces`} accessibilityLabel={`Vendre — ${item.name}`}
          variant="quiet" disabled={blocked} onPress={() => onSell(item)} />
        : <Text style={styles.note}>Retire cet objet avant de vendre son dernier exemplaire.</Text>}
    </>}
    {item.kind === 'RESOURCE' && <Button label="Voir les recettes à l’atelier" onPress={onCraft} />}
    {item.kind === 'CHEST' && <Button label="Ouvrir" accessibilityLabel={`Ouvrir — ${item.name}`}
      busy={busy} disabled={blocked} onPress={() => onOpenChest(item.key)} />}
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  note: { ...type.body, color: color.textMuted },
});
