import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { AnimatedCoinBalance } from '@/components/AnimatedCoinBalance';
import { CoinAmount } from '@/components/CoinAmount';
import { EquipmentBoard } from '@/components/EquipmentBoard';
import { ItemCard } from '@/components/ItemCard';
import { SystemFrame } from '@/components/SystemFrame';
import { decorativeGlow } from '@/design/decorativeGlow';
import { color, equipmentSlotLabel, opacity, radius, space, type, type EquipmentSlot } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { messageFor, type Failure } from '@/features/auth/problems';
import {
  equipItem,
  unequipSlot,
  type EquipmentOutcome,
} from '@/features/inventory/equipmentActions';
import { noteEquipmentChanged } from '@/features/inventory/equipmentRevision';
import { isEquippable, isEquipped, type Inventory } from '@/features/inventory/inventory';
import { INVENTORY_QUERY_KEY, useInventory } from '@/features/inventory/useInventory';
import { openChest, type ChestOpenOutcome } from '@/features/shop/actions';

/**
 * Le sac, la doublure et la bourse — #30, poussé depuis l'accueil et depuis l'onglet Combat.
 *
 * ————— Un seul aller-retour, et un seul état ————————————————————————————————————————————
 *
 * `GET /api/inventory` porte tout, et `PUT`/`DELETE` rendent la **même** forme complète après
 * une mutation. L'écran n'a donc jamais à recharger après un geste, ni à rapiécer ce qu'il
 * avait : il remplace l'entrée du cache par la réponse. L'échange — l'ancien occupant qui
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
 * ————— Le prix s'affiche, et rien ne s'achète ————————————————————————————————————————————
 *
 * La boutique est au lot 6b côté back, pas encore fusionnée. Un prix sans bouton n'est pas un
 * manque : c'est l'échelle qui donne un sens aux pièces qu'on ramasse, et c'est exactement
 * pourquoi le back l'a écrit avant la boutique.
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

  const apply = async (slot: EquipmentSlot, mutate: () => Promise<EquipmentOutcome>) => {
    // Une fois le geste explicite, cette zone devient la sélection de l'utilisateur. Sans ça,
    // le fallback automatique sautait vers le prochain objet non équipé dès la réponse reçue :
    // l'équipement avait réussi, mais son badge disparaissait aussitôt du tiroir affiché.
    setSelection(slot);
    setPending(slot);
    setRefusal(null);

    const outcome = await mutate();
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
    setPendingChest(itemKey);
    setRefusal(null);
    // Un ancien résultat n'est jamais le contenu du coffre qu'on va toucher maintenant.
    setOpenedChest(null);

    const outcome = await openChest(itemKey);
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
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: 'Sac' }} />

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
            style={({ pressed }) => [
              styles.purse,
              purseGlow.effect === undefined ? undefined : { boxShadow: purseGlow.effect.boxShadow },
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/bourse')}
            accessibilityRole="button"
            accessibilityLabel="Bourse"
          >
            <Text style={styles.label}>BOURSE</Text>
            <View style={styles.purseAmount}>
              <CoinAmount amount={data.coins} />
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.shopEntry, pressed && styles.pressed]}
            onPress={() => router.push('/boutique')}
            accessibilityRole="button"
            accessibilityLabel="Boutique"
            testID="shop-entry"
          >
            <View>
              <Text style={styles.label}>BOUTIQUE</Text>
              <Text style={styles.detail}>Dépenser tes pièces</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          {/* Un refus — objet non possédé, emplacement incompatible — au-dessus d'un sac qui
              reste juste : le geste a échoué, pas la lecture. */}
          {refusal === null ? null : <Text style={styles.refusal}>{messageFor(refusal)}</Text>}

          <View style={styles.sectionHead}>
            <View style={styles.sectionCopy}>
              <Text style={styles.section}>ÉQUIPEMENT</Text>
              <Text style={styles.name}>Ta doublure</Text>
            </View>
            <Text style={styles.hint}>Choisis une zone</Text>
          </View>

          <SystemFrame tier="hero">
            <EquipmentBoard equipment={data.equipment} selected={activeSlot} onSelect={setSelection} />
          </SystemFrame>

          <SystemFrame tier="standard">
            <View style={styles.drawer}>
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
                    disabled={pendingChest !== null || (pending !== null && pending !== activeSlot)}
                    onPress={() => void apply(activeSlot, () => unequipSlot(activeSlot))}
                  />
                </View>
              )}

              {availableItems.length > 0 ? <Text style={styles.label}>DANS TON SAC</Text> : null}

              {availableItems.map((line) => (
                <Pressable
                  key={line.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Équiper — ${line.name}`}
                  accessibilityHint={`Remplace l’objet porté sur ${equipmentSlotLabel[line.slot].toLowerCase()}`}
                  disabled={pending !== null || pendingChest !== null}
                  onPress={() => void apply(line.slot, () => equipItem(line.slot, line.key))}
                  style={({ pressed }) => [
                    styles.itemChoice,
                    pressed && styles.pressed,
                    (pending !== null || pendingChest !== null) && styles.inert,
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
            </View>
          </SystemFrame>

          {data.items.filter((line) => line.kind === 'CHEST').length > 0 ? (
            <SystemFrame tier="standard">
              <View style={styles.drawer}>
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
                        disabled={pending !== null || (pendingChest !== null && pendingChest !== line.key)}
                        onPress={() => void revealChest(line.key)}
                      />
                    </View>
                  ))}
              </View>
            </SystemFrame>
          ) : null}

          {openedChest?.kind === 'opened' ? (
            <SystemFrame tier="event" accent="gain">
              <View style={styles.drawer} accessibilityLiveRegion="polite">
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
              </View>
            </SystemFrame>
          ) : null}
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
  shopEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.surface,
    borderRadius: radius.md,
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
  drawerTitle: { ...type.title, color: color.text },
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
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  emptyHint: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  name: { ...type.title, color: color.text },
  detail: { ...type.body, color: color.textMuted },
  label: { ...type.label, color: color.textMuted },
  /** Un geste refusé, au-dessus d'un sac dont les chiffres restent valables. */
  refusal: { ...type.body, color: color.danger, textAlign: 'center' },
});
