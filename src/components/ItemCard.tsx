import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { CoinAmount } from '@/components/CoinAmount';
import { ItemIllustration } from '@/components/ItemIllustration';
import { formatModifier } from '@/features/inventory/format';
import { color, equipmentSlotLabel, radius, rarityColor, rarityLabel, space, type } from '@/design/tokens';

type ItemCardProps = {
  /**
   * `DroppedItem` — la forme qu'un tirage sert. `InventoryLine` l'étend d'une seule clé,
   * `quantity`, portée par la prop du même nom plutôt que lue ici : une carte qui lirait
   * `item.quantity` ne pourrait plus afficher un drop, qui n'en a jamais eu.
   */
  item: components['schemas']['DroppedItem'];
  /**
   * Le nombre d'exemplaires — le sac, jamais un drop. Un objet qui tombe vient de naître, il
   * n'a pas encore de quantité à porter ; c'est l'inventaire qui en crée une ou l'incrémente.
   */
  quantity?: number;
  /** Porté dans son emplacement en ce moment — le sac et rien d'autre. */
  equipped?: boolean;
};

/**
 * Un objet : son nom, sa rareté, son emplacement, ce qu'il change, ce qu'il vaut.
 *
 * **Une seule carte pour les trois écrans** qui le montrent — la récompense d'une séance, la
 * fin d'un combat, le sac où on le range. Trois dessins divergeraient au premier ajustement,
 * et la divergence ne se verrait qu'en les ouvrant côte à côte.
 *
 * La rareté se lit **avant** le nom, en couleur et en toutes lettres : c'est la seule
 * information qu'on prend en un coup d'œil dans une liste, avant même de savoir ce que
 * l'objet fait. Les modificateurs se lisent ensuite, un par ligne, via `formatModifier` — qui
 * porte seul la connaissance de leurs unités, treize d'entre elles. Un objet sans aucun
 * modificateur ne montre simplement pas cette section : une liste vide n'est pas une ligne à
 * afficher.
 *
 * Le prix se lit **nommé** — « Valeur », dans le registre de `slot` — et jamais comme un
 * nombre nu : sur l'écran de récompense, une carte posée juste au-dessus de la ligne « BOURSE »
 * affiche la même unité, la même couleur, à quelques pixels d'écart. Sans le mot, un prix se
 * lit comme le gain que la bourse vient d'afficher — ce sont deux choses différentes, y compris
 * quand elles valent le même nombre par coïncidence.
 */
export function ItemCard({ item, quantity, equipped }: ItemCardProps) {
  // `kind` décide le libellé. Le second cas EQUIPMENT est une ceinture de sûreté pour la forme
  // OpenAPI aplatie : elle ne peut pas exprimer au type que ce variant porte toujours un slot.
  const category =
    item.kind === 'CHEST'
      ? 'Coffre'
      : item.slot === null
        ? 'Équipement'
        : equipmentSlotLabel[item.slot];

  return (
    <View style={[styles.card, { borderColor: rarityColor[item.rarity] }]}>
      <View style={styles.layout}>
        <ItemIllustration
          item={item}
          tint={rarityColor[item.rarity]}
          accessibilityLabel={`Illustration de ${item.name}`}
        />

        <View style={styles.content}>
          <View style={styles.head}>
            <View style={styles.identity}>
              <Text style={[styles.rarity, { color: rarityColor[item.rarity] }]}>
                {rarityLabel[item.rarity].toUpperCase()}
              </Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>

            {quantity === undefined ? null : <Text style={styles.quantity}>×{quantity}</Text>}
          </View>

          <Text style={styles.slot}>{category}</Text>

          {item.modifiers.length === 0 ? null : (
            <View style={styles.modifiers}>
              {item.modifiers.map((modifier, index) => (
                <Text key={index} style={styles.modifier}>
                  {formatModifier(modifier)}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.foot}>
            {/* Un prix nommé, jamais un nombre nu à côté d'une bourse : le pictogramme dit
                désormais l'unité, « Valeur » continue de dire le rôle de ce montant. */}
            <View style={styles.price}>
              <Text style={styles.priceLabel}>Valeur</Text>
              <CoinAmount amount={item.priceCoins} />
            </View>
            {equipped === true ? (
              <View style={styles.equippedBadge}>
                <Text style={styles.equippedLabel}>ÉQUIPÉ</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
  },
  layout: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  content: { flex: 1, gap: space.sm },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  identity: { flexShrink: 1, gap: space.xs },
  rarity: { ...type.label },
  // Un nom légendaire peut être long ; c'est lui qui cède, jamais la quantité, qui est ce
  // qu'on cherche du regard dans un sac.
  name: { ...type.body, color: color.text, flexShrink: 1 },
  quantity: { ...type.body, color: color.textMuted },
  slot: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  modifiers: { gap: space.xs },
  modifier: { ...type.body, color: color.text },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  price: { gap: space.xs },
  // Même registre que `slot` : un libellé de carte, pas une donnée de jeu.
  priceLabel: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  // Même idiome que `RoleBadge` : un statut se distingue en texte, sur la surface relevée,
  // jamais par une couleur de rôle qui appartiendrait déjà à autre chose — ici `gain`, celui
  // d'une ligne de breakdown positive.
  equippedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  equippedLabel: { ...type.label, color: color.text },
});
