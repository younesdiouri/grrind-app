import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ShopCatalog, ShopItemDetails, ShopPurchaseReceipt, type ShopCategory } from '@/components/ShopCatalog';
import { SystemFrame } from '@/components/SystemFrame';
import { useReducedMotion } from '@/design/useReducedMotion';
import { color, control, frame, inventoryArt, opacity, space, type, typography } from '@/design/tokens';
import { messageFor, OFFLINE, type Failure } from '@/features/auth/problems';
import { INVENTORY_QUERY_KEY } from '@/features/inventory/useInventory';
import { purchaseItem, type PurchaseOutcome } from '@/features/shop/actions';
import { SHOP_QUERY_KEY, useShop } from '@/features/shop/useShop';

export default function ShopScreen() {
  const shop = useShop();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const purchaseInFlight = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [category, setCategory] = useState<ShopCategory>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<Failure | null>(null);
  const [purchase, setPurchase] = useState<PurchaseOutcome | null>(null);
  const selected = shop.data?.items.find((item) => item.key === selectedKey);
  const receipt = purchase?.kind === 'purchased' ? purchase.purchase : null;
  const closeDetails = () => setSelectedKey(null);
  const inspect = (key: string) => {
    setSelectedKey(key);
    // Rouvrir un coffre acheté doit permettre d’en acheter un autre exemplaire.
    if (!purchaseInFlight.current) {
      setActionKey(null);
      setRefusal(null);
    }
  };

  const buy = async (itemKey: string) => {
    if (purchaseInFlight.current) return;
    purchaseInFlight.current = true;
    setPending(itemKey);
    setActionKey(itemKey);
    setRefusal(null);
    setPurchase(null);

    try {
      const outcome = await purchaseItem(itemKey);
      if (outcome.kind === 'refused') {
        setRefusal(outcome.failure);
        return;
      }

      setPurchase(outcome);
      // Ownership, disponibilité et solde restent arbitrés par les réponses serveur.
      void queryClient.invalidateQueries({ queryKey: SHOP_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    } catch {
      setRefusal(OFFLINE);
    } finally {
      purchaseInFlight.current = false;
      setPending(null);
    }
  };

  return <View style={styles.root}>
    <Stack.Screen options={{ title: 'Boutique' }} />
    <ScrollView contentContainerStyle={[styles.screen, { paddingBottom: Math.max(insets.bottom, space.lg) }]} testID="shop-screen">
      {shop.isPending && <View style={styles.loading}><ActivityIndicator color={color.accent} /></View>}
      {shop.isError && <SystemFrame contentStyle={styles.notice}>
        <Text style={styles.noticeTitle}>Boutique indisponible</Text>
        <Text style={styles.detail}>{messageFor(shop.error)}</Text>
        <Button label="Réessayer" variant="quiet" onPress={() => void shop.refetch()} />
      </SystemFrame>}

      {refusal !== null && selectedKey !== actionKey && <Text style={styles.refusal} accessibilityRole="alert">{messageFor(refusal)}</Text>}
      {receipt !== null && selectedKey !== actionKey && <SystemFrame accent="gain" contentStyle={styles.notice}>
        <Text style={styles.success} accessibilityLiveRegion="polite">✓ {receipt.item.name} est dans ton sac</Text>
      </SystemFrame>}

      {shop.data !== undefined && <ShopCatalog items={shop.data.items} category={category} onCategory={setCategory}
        onSelect={inspect} />}
    </ScrollView>

    <Modal visible={selectedKey !== null} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={closeDetails}>
      <View style={[styles.modal, { paddingTop: insets.top + space.md, paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <Pressable style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no" onPress={closeDetails} />
        <View style={styles.sheet} accessibilityViewIsModal onAccessibilityEscape={closeDetails}>
          <View style={styles.sheetHead}>
            <Text style={styles.eyebrow}>{receipt !== null && actionKey === selectedKey ? 'ACQUISITION' : 'À LA LOUPE'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" onPress={closeDetails}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Text style={styles.closeLabel}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.drawer}>
            {refusal !== null && actionKey === selectedKey && <Text style={styles.refusal} accessibilityRole="alert">{messageFor(refusal)}</Text>}
            {receipt !== null && actionKey === selectedKey
              ? <ShopPurchaseReceipt purchase={receipt} onContinue={closeDetails} />
              : selected !== undefined
                ? <ShopItemDetails key={selected.key} item={selected} busy={pending !== null} onBuy={() => void buy(selected.key)} />
                : <Text style={styles.detail}>Cet objet n’est plus dans l’étal.</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { padding: space.lg, paddingTop: space.sm, gap: space.lg },
  eyebrow: { ...type.label, fontFamily: typography.display.semibold, color: color.accent },
  loading: { paddingVertical: space.xl, alignItems: 'center' },
  notice: { padding: space.md, gap: space.sm },
  noticeTitle: { ...type.body, fontFamily: typography.display.semibold, color: color.text },
  detail: { ...type.body, color: color.textMuted },
  refusal: { ...type.body, color: color.danger },
  success: { ...type.body, color: color.gain },
  modal: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: space.md, backgroundColor: inventoryArt.scrim },
  sheet: { width: '100%', maxWidth: inventoryArt.sheetMaxWidth, maxHeight: inventoryArt.sheetMaxHeight, alignSelf: 'center',
    backgroundColor: color.surface, borderWidth: frame.standard.borderWidth, borderColor: color.accent, borderRadius: frame.hero.radius },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: space.md,
    borderBottomWidth: frame.standard.borderWidth, borderBottomColor: color.border },
  close: { minWidth: control.backSize, minHeight: control.backSize, alignItems: 'center', justifyContent: 'center' },
  closeLabel: { ...type.title, color: color.textMuted },
  drawer: { padding: space.md, gap: space.md },
  pressed: { opacity: opacity.pressed },
});
