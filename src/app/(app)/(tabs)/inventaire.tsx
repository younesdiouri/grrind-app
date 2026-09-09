import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AnimatedCoinBalance } from '@/components/AnimatedCoinBalance';
import { AmbientBackdrop } from '@/components/AmbientBackdrop';
import { CoinAmount } from '@/components/CoinAmount';
import { CharacterInventory } from '@/components/CharacterInventory';
import { EquipmentBoard } from '@/components/EquipmentBoard';
import { ItemCard } from '@/components/ItemCard';
import { SystemFrame } from '@/components/SystemFrame';
import { decorativeGlow } from '@/design/decorativeGlow';
import {
  ambient,
  color,
  equipmentSlotLabel,
  frame,
  opacity,
  space,
  type,
  typography,
  type EquipmentSlot,
} from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { messageFor, OFFLINE, type Failure } from '@/features/auth/problems';
import {
  equipItem,
  unequipSlot,
  type EquipmentOutcome,
} from '@/features/inventory/equipmentActions';
import { noteEquipmentChanged } from '@/features/inventory/equipmentRevision';
import { isEquippable, isEquipped, type Inventory, type InventoryLine } from '@/features/inventory/inventory';
import { INVENTORY_QUERY_KEY, useInventory } from '@/features/inventory/useInventory';
import { openChest, type ChestOpenOutcome } from '@/features/shop/actions';
import { useAuth } from '@/features/auth/useAuth';
import { salesFor } from '@/features/inventory/sales';
import type { PendingSale, Sale, SaleInput } from '@/features/inventory/saleRunner';
import { inventoryAfterSale } from '@/features/inventory/saleInventory';
import { SHOP_QUERY_KEY } from '@/features/shop/useShop';

/**
 * Le sac, la doublure et la bourse — #30, poussé depuis l'accueil et depuis l'onglet Combat.
 *
 * ————— Un seul aller-retour, et un seul état ————————————————————————————————————————————
 *
 * `GET /api/inventory` porte tout, et `PUT`/`DELETE` rendent la **même** forme complète après
 * un équipement. Pour ces gestes, l'écran remplace l'entrée du cache par la réponse. L'échange — l'ancien occupant qui
 * retourne au sac — est décidé côté serveur, dans la transaction ; le rejouer ici serait le
 * décider une seconde fois.
 *
 * ————— Deux listes, jamais dérivées l'une de l'autre ——————————————————————————————————
 *
 * `equipment` porte **toujours** les sept emplacements, `null` pour les vides : un emplacement
 * libre est une information, pas un trou, et c'est même la moitié de ce que cet écran montre —
 * ce qu'on pourrait porter et qu'on ne porte pas.
 *
 * `items` porte **tout** ce que le joueur possède, équipé compris. Ce n'est pas une liste à
 * recouper contre `equipment` : c'est la même ligne vue sous un autre angle. On ne filtre donc
 * rien, on marque — voir `isEquipped`.
 *
 * Une vente conserve son intention jusqu’au verdict. Son solde et sa quantité viennent du
 * serveur; une relecture remet ensuite le sac et la boutique en cohérence avec le catalogue.
 */
export default function InventoryScreen() {
  const inventory = useInventory();
  const queryClient = useQueryClient();

  /**
   * L'emplacement dont la mutation est partie, ou `null`.
   *
   * Un emplacement et non un booléen, pour la raison du bouton « Combattre » de l'onglet
   * Combat : il faut savoir **lequel** montre son témoin. Tous les autres gestes deviennent
   * inertes avec lui — deux échanges en vol sur le même sac sont deux réponses complètes qui
   * se contredisent, et c'est la dernière arrivée qui gagnerait.
   */
  const [pending, setPending] = useState<EquipmentSlot | null>(null);
  const [pendingChest, setPendingChest] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<Failure | null>(null);
  const [selection, setSelection] = useState<EquipmentSlot | null>(null);
  const [openedChest, setOpenedChest] = useState<ChestOpenOutcome | null>(null);
  const purseGlow = decorativeGlow('soft', useReducedMotion());
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.user.id : null;
  const saleActions = userId === null ? null : salesFor(userId);
  const mutationInFlight = useRef(false);
  const saleDialogOpen = useRef(false);
  const [saleReady, setSaleReady] = useState(false);
  const [unresolvedSale, setUnresolvedSale] = useState<PendingSale | null>(null);
  const [saleBusy, setSaleBusy] = useState(false);
  const [sold, setSold] = useState<Sale | null>(null);
  const blocked = pending !== null || pendingChest !== null || saleBusy || !saleReady || unresolvedSale !== null;

  useEffect(() => {
    let alive = true;
    if (saleActions === null) return;
    void saleActions.pending().then((held) => {
      if (alive) {
        setUnresolvedSale(held);
        setSaleReady(true);
      }
    }).catch(() => { if (alive) setRefusal(OFFLINE); });
    return () => { alive = false; };
  }, [saleActions]);

  const sell = async (body: SaleInput) => {
    if (mutationInFlight.current || saleActions === null) return;
    mutationInFlight.current = true;
    setSaleBusy(true);
    setRefusal(null);
    setSold(null);
    try {
      const outcome = await saleActions.sell(body);
      setUnresolvedSale(await saleActions.pending());
      if (outcome.kind === 'refused') {
        setRefusal(outcome.failure);
      } else {
        setSold(outcome.sale);
        queryClient.setQueryData<Inventory>(INVENTORY_QUERY_KEY, (previous) =>
          previous === undefined ? previous : inventoryAfterSale(previous, outcome.sale));
        noteEquipmentChanged();
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: SHOP_QUERY_KEY }),
      ]);
    } catch {
      setRefusal(OFFLINE);
      setSaleReady(false);
    } finally {
      mutationInFlight.current = false;
      setSaleBusy(false);
    }
  };

  const confirmSale = (line: InventoryLine) => {
    if (blocked || mutationInFlight.current || saleDialogOpen.current) return;
    saleDialogOpen.current = true;
    Alert.alert('Vendre un exemplaire ?',
      `${line.name}\n1 exemplaire · ${line.sellPriceCoins} pièces${line.sellPriceCoins === 0 ? '\nTu ne recevras aucune pièce.' : ''}`,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => { saleDialogOpen.current = false; } },
        { text: 'Confirmer la vente', onPress: () => {
          saleDialogOpen.current = false;
          void sell({ itemKey: line.key, expectedSellPriceCoins: line.sellPriceCoins });
        } },
      ], { onDismiss: () => { saleDialogOpen.current = false; } });
  };

  const apply = async (slot: EquipmentSlot, mutate: () => Promise<EquipmentOutcome>) => {
    if (blocked || mutationInFlight.current) return;
    mutationInFlight.current = true;
    // Une fois le geste explicite, cette zone devient la sélection de l'utilisateur. Sans ça,
    // le fallback automatique sautait vers le prochain objet non équipé dès la réponse reçue :
    // l'équipement avait réussi, mais son badge disparaissait aussitôt du tiroir affiché.
    setSelection(slot);
    setPending(slot);
    setRefusal(null);

    const outcome = await mutate();
    mutationInFlight.current = false;
    setPending(null);

    if (!outcome.ok) {
      setRefusal(outcome.failure);
      return;
    }

    // La réponse **est** l'état : elle remplace le cache, sans second `GET` qui gagnerait la
    // course contre l'écran qu'il est censé mettre à jour.
    queryClient.setQueryData<Inventory>(INVENTORY_QUERY_KEY, outcome.inventory);

    // Et l'onglet Combat doit relire son combattant : `player` porte les modificateurs
    // équipés, et cet onglet-là ne se démonte pas. Sur la réponse, jamais sur l'intention —
    // un refus n'a rien changé.
    noteEquipmentChanged();
  };

  const revealChest = async (itemKey: string) => {
    if (blocked || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setPendingChest(itemKey);
    setRefusal(null);
    // Un ancien résultat n'est jamais le contenu du coffre qu'on va toucher maintenant.
    setOpenedChest(null);

    const outcome = await openChest(itemKey).catch(() => ({ kind: 'refused', failure: OFFLINE }) as const);
    mutationInFlight.current = false;
    setPendingChest(null);

    if (outcome.kind === 'refused') {
      setRefusal(outcome.failure);
      return;
    }

    setOpenedChest(outcome);
    void queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
  };

  // Lu une fois, hors du JSX : `inventory.data` est une propriété d'un objet que TypeScript
  // ne peut pas garder affinée à l'intérieur des fermetures d'un `map`.
  const data = inventory.data;
  const activeSlot =
    selection ??
    data?.items.find((line) => isEquippable(line) && !isEquipped(data, line.key))?.slot ??
    data?.items.find(isEquippable)?.slot ??
    'HEAD';
  const equippedLine = data?.equipment[activeSlot] ?? null;
  const compatibleItems =
    data?.items.filter(isEquippable).filter((line) => line.slot === activeSlot) ?? [];
  const availableItems = compatibleItems.filter((line) => line.key !== equippedLine?.key);

  return (
    <View style={styles.shell}>
      <AmbientBackdrop />
      <ScrollView style={styles.contentLayer} contentContainerStyle={styles.screen}>

      {inventory.isPending ? (
        <View style={styles.loading}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : null}

      {inventory.isError ? (
        <View style={styles.card}>
          <Text style={styles.name}>Sac indisponible</Text>
          <Text style={styles.detail}>{messageFor(inventory.error)}</Text>
          <Button label="Réessayer" onPress={() => void inventory.refetch()} variant="quiet" />
        </View>
      ) : null}

      {data === undefined ? null : (
        <>
          {/* La bourse en tête : cet écran lui appartient autant qu'au sac. Touchable depuis
              #129 — c'est de là que le ledger de pièces s'ouvre, la seule porte vers son
              histoire. */}
          <Pressable
            style={({ pressed }) => [pressed && styles.pressed]}
            onPress={() => router.push('/bourse')}
            accessibilityRole="button"
            accessibilityLabel="Bourse"
          >
            <SystemFrame
              tier="hero"
              style={purseGlow.effect === undefined ? undefined : { boxShadow: purseGlow.effect.boxShadow }}
              contentStyle={styles.purse}
            >
              <Text style={styles.label}>BOURSE</Text>
              <View style={styles.purseAmount}>
                <CoinAmount amount={data.coins} />
                <Text style={styles.chevron}>›</Text>
              </View>
            </SystemFrame>
          </Pressable>

          <Pressable
            style={({ pressed }) => [pressed && styles.pressed]}
            disabled={blocked}
            onPress={() => router.push('/boutique')}
            accessibilityRole="button"
            accessibilityLabel="Boutique"
            testID="shop-entry"
          >
            <SystemFrame contentStyle={styles.shopEntry}>
              <View>
                <Text style={styles.label}>BOUTIQUE</Text>
                <Text style={styles.detail}>Dépenser tes pièces</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </SystemFrame>
          </Pressable>

          {refusal !== null || !saleReady || unresolvedSale !== null || sold !== null ? (
            <SystemFrame contentStyle={styles.drawer}>
            {refusal === null ? null : <Text style={styles.refusal}>{messageFor(refusal)}</Text>}
            {saleReady ? null : (
              <Button label="Réessayer" variant="quiet" onPress={() => {
                if (saleActions === null) return;
                void saleActions.pending().then((held) => {
                  setUnresolvedSale(held);
                  setSaleReady(true);
                  setRefusal(null);
                }).catch(() => setRefusal(OFFLINE));
              }} />
            )}
            {unresolvedSale === null ? null : (
              <View style={styles.current}>
                <Text style={styles.name}>Vente à vérifier</Text>
                <Text style={styles.detail}>
                  {data.items.find((line) => line.key === unresolvedSale.body.itemKey)?.name ?? 'Objet de la vente en attente'}
                  {' · 1 exemplaire · '}{unresolvedSale.body.expectedSellPriceCoins} pièces
                </Text>
                <Text style={styles.detail}>Réessaie pour vérifier le résultat de cette vente avant de modifier ton sac.</Text>
                <Button label="Réessayer la vente" busy={saleBusy} onPress={() => void sell(unresolvedSale.body)} />
              </View>
            )}
            {sold === null ? null : (
              <Text style={styles.detail} accessibilityLiveRegion="polite">
                Exemplaire vendu · {sold.coins} pièces reçues
              </Text>
            )}
            </SystemFrame>
          ) : null}

          <CharacterInventory inventory={data} statistics={data.statistics} equipment={
            <>
          <View style={styles.sectionHead}>
            <View style={styles.sectionCopy}>
              <Text style={styles.section}>ÉQUIPEMENT</Text>
              <Text style={styles.name}>Ta doublure</Text>
            </View>
            <Text style={styles.hint}>Choisis une zone</Text>
          </View>

          <EquipmentBoard equipment={data.equipment} selected={activeSlot} onSelect={setSelection} />

          <SystemFrame contentStyle={styles.drawer}>
            <View style={styles.drawerHead}>
              <View style={styles.sectionCopy}>
                <Text style={styles.label}>{equipmentSlotLabel[activeSlot].toUpperCase()}</Text>
                <Text style={styles.drawerTitle}>
                  {equippedLine === null ? 'Emplacement libre' : 'Objet équipé'}
                </Text>
              </View>
              <Text style={styles.count}>
                {compatibleItems.length} compatible{compatibleItems.length === 1 ? '' : 's'}
              </Text>
            </View>

            {equippedLine === null ? null : (
              <View style={styles.current}>
                <ItemCard item={equippedLine} quantity={equippedLine.quantity} equipped />
                <Button
                  label="Retirer"
                  variant="quiet"
                  busy={pending === activeSlot}
                  disabled={blocked}
                  onPress={() => void apply(activeSlot, () => unequipSlot(activeSlot))}
                />
                {equippedLine.quantity > 1 ? (
                  <Button label={`Vendre · ${equippedLine.sellPriceCoins} pièces`}
                    accessibilityLabel={`Vendre — ${equippedLine.name}`}
                    variant="quiet" disabled={blocked} onPress={() => confirmSale(equippedLine)} />
                ) : <Text style={styles.detail}>Retire cet objet avant de vendre son dernier exemplaire.</Text>}
              </View>
            )}

            {availableItems.length > 0 ? <Text style={styles.label}>DANS TON SAC</Text> : null}

            {availableItems.map((line) => (
              <View key={line.key} style={styles.current}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Équiper — ${line.name}`}
                  accessibilityHint={`Remplace l’objet porté sur ${equipmentSlotLabel[line.slot].toLowerCase()}`}
                  disabled={blocked}
                  onPress={() => void apply(line.slot, () => equipItem(line.slot, line.key))}
                  style={({ pressed }) => [
                    styles.itemChoice,
                    pressed && styles.pressed,
                    blocked && styles.inert,
                  ]}
                >
                  <ItemCard item={line} quantity={line.quantity} />
                  <View style={styles.equipHint}>
                    <Text style={styles.equipHintText}>
                      {pending === line.slot ? 'Équipement…' : 'Toucher pour équiper'}
                    </Text>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </Pressable>
                <Button label={`Vendre · ${line.sellPriceCoins} pièces`}
                  accessibilityLabel={`Vendre — ${line.name}`}
                  variant="quiet" disabled={blocked} onPress={() => confirmSale(line)} />
              </View>
            ))}

            {availableItems.length === 0 ? (
              <View style={styles.emptyChoice}>
                <Text style={styles.detail}>
                  {equippedLine === null
                    ? 'Aucun objet compatible dans ton sac.'
                    : 'Aucune autre option pour cet emplacement.'}
                </Text>
                <Text style={styles.emptyHint}>Tes prochains drops apparaîtront ici.</Text>
              </View>
            ) : null}
          </SystemFrame>

            </>
          } bag={
            <>
              {data.items.length === 0 ? <Text style={styles.detail}>Le sac est vide.</Text> : null}
              {data.items.filter(isEquippable).map((line) => (
                <View key={line.key} style={styles.current}>
                  <ItemCard item={line} quantity={line.quantity} equipped={isEquipped(data, line.key)} />
                  {isEquipped(data, line.key) ? null : (
                    <Button label={`Équiper — ${line.name}`} disabled={blocked}
                      onPress={() => void apply(line.slot, () => equipItem(line.slot, line.key))} />
                  )}
                  {!isEquipped(data, line.key) || line.quantity > 1 ? (
                    <Button label={`Vendre · ${line.sellPriceCoins} pièces`} variant="quiet" disabled={blocked}
                      onPress={() => confirmSale(line)} />
                  ) : null}
                </View>
              ))}
          {data.items.filter((line) => line.kind === 'CHEST').length > 0 ? (
            <SystemFrame contentStyle={styles.drawer}>
              <View style={styles.drawerHead}>
                <View style={styles.sectionCopy}>
                  <Text style={styles.label}>COFFRES</Text>
                  <Text style={styles.drawerTitle}>À ouvrir</Text>
                </View>
              </View>
              {data.items
                .filter((line) => line.kind === 'CHEST')
                .map((line) => (
                  <View key={line.key} style={styles.current}>
                    <ItemCard item={line} quantity={line.quantity} />
                    <Button
                      label="Ouvrir"
                      busy={pendingChest === line.key}
                      disabled={blocked}
                      onPress={() => void revealChest(line.key)}
                    />
                  </View>
                ))}
            </SystemFrame>
          ) : null}

          {openedChest?.kind === 'opened' ? (
            <View accessibilityLiveRegion="polite">
              <SystemFrame contentStyle={styles.drawer}>
                <Text style={styles.label}>CONTENU DU COFFRE</Text>
                {openedChest.chest.items.length === 0 && openedChest.chest.coins === 0 ? (
                  <Text style={styles.detail}>Le coffre était vide.</Text>
                ) : (
                  <>
                    {openedChest.chest.items.map((item) => <ItemCard key={item.key} item={item} />)}
                    <Text style={styles.detail}>Pièces trouvées</Text>
                    <CoinAmount amount={openedChest.chest.coins} />
                  </>
                )}
                <AnimatedCoinBalance
                  before={openedChest.chest.coinsBefore}
                  after={openedChest.chest.coinsAfter}
                />
              </SystemFrame>
            </View>
          ) : null}
            </>
          } />
        </>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, overflow: 'hidden' },
  contentLayer: { zIndex: ambient.contentLayer },
  screen: { padding: space.lg, gap: space.md },
  loading: { paddingVertical: space.xl, alignItems: 'center' },
  purse: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.md,
  },
  shopEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.md,
  },
  // Même retour d'appui que `BagRow` : la ligne s'éteint sous le doigt, rien ne se déplace.
  pressed: { opacity: opacity.pressed },
  purseAmount: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chevron: { ...type.body, color: color.textMuted },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.md,
  },
  sectionCopy: { gap: space.xs },
  section: { ...type.label, color: color.accent },
  hint: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  drawer: {
    padding: space.md,
    gap: space.md,
  },
  drawerHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  drawerTitle: {
    ...type.title,
    color: color.text,
    fontFamily: typography.display.semibold,
    fontWeight: typography.display.weight.semibold,
  },
  count: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  current: { gap: space.sm },
  itemChoice: { gap: space.sm },
  inert: { opacity: opacity.inert },
  equipHint: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
  },
  equipHintText: { ...type.label, color: color.text, letterSpacing: 0 },
  emptyChoice: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    borderRadius: frame.standard.radius,
    padding: space.md,
    gap: space.xs,
  },
  emptyHint: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  card: {
    backgroundColor: color.surface,
    borderRadius: frame.standard.radius,
    padding: space.md,
    gap: space.sm,
  },
  name: {
    ...type.title,
    color: color.text,
    fontFamily: typography.display.semibold,
    fontWeight: typography.display.weight.semibold,
  },
  detail: { ...type.body, color: color.textMuted },
  label: { ...type.label, color: color.textMuted },
  /** Un geste refusé, au-dessus d'un sac dont les chiffres restent valables. */
  refusal: { ...type.body, color: color.danger, textAlign: 'center' },
});
