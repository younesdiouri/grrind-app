import { useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { CoinAmount } from '@/components/CoinAmount';
import { ItemCard } from '@/components/ItemCard';
import { color, equipmentSlotLabel, opacity, radius, space, type, type EquipmentSlot } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import {
  equipItem,
  unequipSlot,
  type EquipmentOutcome,
} from '@/features/inventory/equipmentActions';
import { noteEquipmentChanged } from '@/features/inventory/equipmentRevision';
import { equippedSlots, isEquipped, type Inventory } from '@/features/inventory/inventory';
import { INVENTORY_QUERY_KEY, useInventory } from '@/features/inventory/useInventory';

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
  const [refusal, setRefusal] = useState<Failure | null>(null);

  const apply = async (slot: EquipmentSlot, mutate: () => Promise<EquipmentOutcome>) => {
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

  // Lu une fois, hors du JSX : `inventory.data` est une propriété d'un objet que TypeScript
  // ne peut pas garder affinée à l'intérieur des fermetures d'un `map`.
  const data = inventory.data;

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
            style={({ pressed }) => [styles.purse, pressed && styles.pressed]}
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

          {/* Un refus — objet non possédé, emplacement incompatible — au-dessus d'un sac qui
              reste juste : le geste a échoué, pas la lecture. */}
          {refusal === null ? null : <Text style={styles.refusal}>{messageFor(refusal)}</Text>}

          <Text style={styles.section}>Équipement</Text>
          {equippedSlots(data).map(({ slot, line }) =>
            /* Un emplacement libre tient sur **une** ligne : les sept, écrits chacun sur deux
               lignes, occupaient tout l'écran d'un joueur qui n'a encore rien — et poussaient
               le sac, la seule chose qu'il vienne regarder, sous la ligne de flottaison. Ils
               restent tous là, c'est ce que le contrat sert et c'est une information ; ils ne
               prennent simplement plus la place de ce qu'ils n'ont pas. */
            line === null ? (
              <View key={slot} style={styles.emptySlot}>
                <Text style={styles.label}>{equipmentSlotLabel[slot].toUpperCase()}</Text>
                <Text style={styles.detail}>Vide</Text>
              </View>
            ) : (
              <View key={slot} style={styles.slot}>
                <Text style={styles.label}>{equipmentSlotLabel[slot].toUpperCase()}</Text>
                <ItemCard item={line} quantity={line.quantity} equipped />
                <Button
                  label="Retirer"
                  variant="quiet"
                  busy={pending === slot}
                  disabled={pending !== null && pending !== slot}
                  onPress={() => void apply(slot, () => unequipSlot(slot))}
                />
              </View>
            ),
          )}

          <Text style={styles.section}>Sac</Text>
          {data.items.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.name}>Ton sac est vide</Text>
              <Text style={styles.detail}>
                Les objets tombent des séances créditées et des combats gagnés.
              </Text>
            </View>
          ) : null}

          {data.items.map((line) => {
            const worn = isEquipped(data, line.key);

            return (
              <View key={line.key} style={styles.slot}>
                <ItemCard item={line} quantity={line.quantity} equipped={worn} />
                {/* Rien à proposer sur ce qu'on porte déjà : l'emplacement se libère depuis la
                    doublure, au-dessus, où le geste a un sens. */}
                {worn ? null : (
                  <Button
                    label={`Équiper — ${equipmentSlotLabel[line.slot]}`}
                    variant="quiet"
                    busy={pending === line.slot}
                    disabled={pending !== null && pending !== line.slot}
                    onPress={() => void apply(line.slot, () => equipItem(line.slot, line.key))}
                  />
                )}
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
  // Même retour d'appui que `BagRow` : la ligne s'éteint sous le doigt, rien ne se déplace.
  pressed: { opacity: opacity.pressed },
  purseAmount: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chevron: { ...type.body, color: color.textMuted },
  section: { ...type.label, color: color.textMuted, marginTop: space.md },
  slot: { gap: space.sm },
  /** Un emplacement libre : le nom, et ce qu'il n'a pas, sur une seule ligne. */
  emptySlot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
