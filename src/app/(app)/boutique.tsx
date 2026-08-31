import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CoinAmount } from '@/components/CoinAmount';
import { ItemCard } from '@/components/ItemCard';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { INVENTORY_QUERY_KEY } from '@/features/inventory/useInventory';
import { purchaseItem, type PurchaseOutcome } from '@/features/shop/actions';
import { SHOP_QUERY_KEY, useShop } from '@/features/shop/useShop';

type Listing = NonNullable<ReturnType<typeof useShop>['data']>['items'][number];

function purchaseControl(item: Listing): { label: string; disabled: boolean } {
  if (!item.unlocked) {
    return { label: `Niveau ${item.minimumLevel}`, disabled: true };
  }

  // `owned` bloque l'équipement, jamais le coffre : celui-ci s'empile et chaque exemplaire
  // reste une ouverture. La décision suit `kind`, pas l'absence d'emplacement.
  if (item.kind === 'EQUIPMENT' && item.owned) {
    return { label: 'Déjà possédé', disabled: true };
  }

  if (!item.affordable) {
    return { label: 'Pas assez de pièces', disabled: true };
  }

  return { label: 'Acheter', disabled: false };
}

/** L'étal : tout ce que le serveur rend reste visible, y compris ce qui est verrouillé. */
export default function ShopScreen() {
  const shop = useShop();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<Failure | null>(null);
  const [purchase, setPurchase] = useState<PurchaseOutcome | null>(null);

  const buy = async (itemKey: string) => {
    setPending(itemKey);
    setRefusal(null);
    setPurchase(null);

    const outcome = await purchaseItem(itemKey);
    setPending(null);

    if (outcome.kind === 'refused') {
      setRefusal(outcome.failure);
      return;
    }

    setPurchase(outcome);
    // Le serveur tranche availability, ownership et solde. Relire évite de les reconstruire
    // ici, où un calcul local ferait vieillir l'étal à la première règle ajoutée au back.
    void queryClient.invalidateQueries({ queryKey: SHOP_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: 'Boutique' }} />

      {shop.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : null}

      {shop.isError ? (
        <View style={styles.card}>
          <Text style={styles.name}>Boutique indisponible</Text>
          <Text style={styles.detail}>{messageFor(shop.error)}</Text>
          <Button label="Réessayer" variant="quiet" onPress={() => void shop.refetch()} />
        </View>
      ) : null}

      {shop.data === undefined ? null : (
        <>
          <Text style={styles.section}>BOUTIQUE</Text>
          <View style={styles.purse}>
            <Text style={styles.label}>BOURSE</Text>
            <CoinAmount amount={shop.data.coins} />
          </View>

          {refusal === null ? null : <Text style={styles.refusal}>{messageFor(refusal)}</Text>}

          {purchase?.kind === 'purchased' ? (
            <View style={styles.card} accessibilityLiveRegion="polite">
              <Text style={styles.name}>Achat effectué</Text>
              <View style={styles.balance}>
                <CoinAmount amount={purchase.purchase.coinsBefore} />
                <Text style={styles.chevron}>›</Text>
                <CoinAmount amount={purchase.purchase.coinsAfter} />
              </View>
            </View>
          ) : null}

          {shop.data.items.map((item) => {
            const control = purchaseControl(item);
            return (
              <View key={item.key} style={styles.listing}>
                <ItemCard item={item} />
                <Text style={styles.detail}>Niveau {item.minimumLevel}</Text>
                <Button
                  label={control.label}
                  busy={pending === item.key}
                  disabled={control.disabled || (pending !== null && pending !== item.key)}
                  onPress={() => void buy(item.key)}
                />
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  loading: { paddingVertical: space.xl, alignItems: 'center' },
  purse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
  card: { backgroundColor: color.surface, borderRadius: radius.md, padding: space.md, gap: space.sm },
  listing: { gap: space.sm },
  balance: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { ...type.label, color: color.textMuted },
  section: { ...type.label, color: color.textMuted },
  name: { ...type.title, color: color.text },
  detail: { ...type.body, color: color.textMuted },
  refusal: { ...type.body, color: color.danger, textAlign: 'center' },
  chevron: { ...type.body, color: color.textMuted },
});
