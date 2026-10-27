import { useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { CoinAmount } from '@/components/CoinAmount';
import { ItemIllustration } from '@/components/ItemIllustration';
import { SystemFrame } from '@/components/SystemFrame';
import { color, control, equipmentSlotLabel, frame, opacity, rarityColor, rarityLabel, shopArt, space, type, typography } from '@/design/tokens';
import { formatModifier } from '@/features/inventory/format';
import { purchaseControl } from '@/features/shop/shopState';

type Listing = components['schemas']['ShopListing'];
const CATEGORIES = { all: 'Tous', equipment: 'Équipement', chests: 'Coffres' } as const;
export type ShopCategory = keyof typeof CATEGORIES;

/** Décor vectoriel fixe : la lumière ne remplace jamais l’illustration publiée. */
function ShopStage({ item, size, featured = false, expanded = false }: {
  item: components['schemas']['DroppedItem']; size: number; featured?: boolean; expanded?: boolean;
}) {
  const id = useId().replace(/\W/g, '');
  const tint = rarityColor[item.rarity];
  return <View style={[styles.stage, featured && styles.featuredStage, expanded && styles.detailStage]}>
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 200 180" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`${id}halo`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={tint} stopOpacity={shopArt.glowOpacity} />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={`${id}beam`} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={tint} stopOpacity="0.12" />
            <Stop offset="1" stopColor={tint} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="200" height="180" fill={`url(#${id}halo)`} />
        <Path d="M27 147 54 18h92l27 129Z" fill={`url(#${id}beam)`} />
        <Ellipse cx="100" cy="151" rx="72" ry="16" fill={color.background} />
        <Ellipse cx="100" cy="146" rx="72" ry="15" fill={color.surfaceRaised} stroke={tint} strokeOpacity="0.3" />
        <Ellipse cx="100" cy="146" rx="58" ry="10" fill="none" stroke={tint} strokeOpacity="0.55" />
        <Path d="M43 155q57 21 114 0" fill="none" stroke={tint} strokeOpacity="0.18" strokeWidth="2" />
        <Path d="m39 52 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill={tint} opacity={shopArt.speckOpacity} />
        <Circle cx="158" cy="78" r="1.5" fill={tint} opacity={shopArt.speckOpacity} />
        <Circle cx="54" cy="108" r="1" fill={tint} opacity={shopArt.speckOpacity} />
        <Path d="m158 32 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z" fill={tint} opacity={shopArt.speckOpacity} />
      </Svg>
    </View>
    <View style={styles.illustration}>
      <ItemIllustration item={item} size={size} tint={tint} transparent />
    </View>
  </View>;
}

function categoryLabel(item: Listing) {
  return item.kind === 'CHEST' ? 'Coffre' : item.kind === 'RESOURCE' ? 'Composant' : item.slot === null ? 'Équipement' : equipmentSlotLabel[item.slot];
}

function stateLabel(item: Listing) {
  return !item.unlocked ? `Niveau ${item.minimumLevel}` : item.kind === 'EQUIPMENT' && item.owned ? 'Déjà possédé' : null;
}

export function ShopCatalog({ items, category, onCategory, onSelect }: {
  items: Listing[]; category: ShopCategory; onCategory(category: ShopCategory): void; onSelect(key: string): void;
}) {
  const visible = items.filter((item) => category === 'all' || (category === 'chests' ? item.kind === 'CHEST' : item.kind === 'EQUIPMENT'));
  const featured = items.find((item) => item.kind === 'EQUIPMENT' && item.unlocked && !item.owned && item.rarity !== 'COMMON')
    ?? items.find((item) => item.unlocked && !(item.kind === 'EQUIPMENT' && item.owned)) ?? items[0];

  return <View style={styles.catalog}>
    {category === 'all' && featured && <Pressable accessibilityRole="button"
      accessibilityLabel={`En vitrine : ${featured.name}, ${rarityLabel[featured.rarity]}, ${featured.priceCoins} pièces`}
      accessibilityHint="Ouvrir la fiche de l’objet" onPress={() => onSelect(featured.key)}
      style={({ pressed }) => pressed && styles.pressed} testID="shop-featured">
      <SystemFrame tier="hero" style={{ borderColor: rarityColor[featured.rarity] }} contentStyle={styles.featured}>
        <ShopStage item={featured} size={shopArt.featuredIconSize} featured />
        <View style={styles.featuredInfo}>
          <Text style={styles.eyebrow}>EN VITRINE</Text>
          <Text style={styles.featuredName}>{featured.name}</Text>
          <Text style={styles.category}>{categoryLabel(featured)}</Text>
          <CoinAmount amount={featured.priceCoins} />
          <Text style={styles.discover}>Découvrir  ›</Text>
        </View>
      </SystemFrame>
    </Pressable>}

    <View style={styles.filters} accessibilityRole="tablist">
      {(Object.keys(CATEGORIES) as ShopCategory[]).map((key) => <Pressable key={key} accessibilityRole="tab"
        aria-selected={category === key} onPress={() => onCategory(key)} testID={`shop-filter-${key}`}
        style={({ pressed }) => [styles.filter, category === key && styles.filterActive, pressed && styles.pressed]}>
        <Text style={[styles.filterLabel, category === key && styles.activeLabel]}>{CATEGORIES[key]}</Text>
        {category === key && <View style={styles.filterLight} />}
      </Pressable>)}
    </View>

    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{category === 'chests' ? 'Les coffres' : category === 'equipment' ? 'L’armurerie' : 'L’étal'}</Text>
      <View style={styles.rule} />
      <Text style={styles.count}>{visible.length}</Text>
    </View>
    {visible.length === 0 && <SystemFrame contentStyle={styles.empty}>
      <Text style={styles.sectionTitle}>{items.length === 0 ? 'L’étal est vide' : 'Rien ici pour le moment'}</Text>
    </SystemFrame>}

    {Array.from({ length: Math.ceil(visible.length / shopArt.columns) }, (_, row) => <View key={row} style={styles.row}>
      {Array.from({ length: shopArt.columns }, (_, column) => {
        const item = visible[row * shopArt.columns + column];
        if (!item) return <View key={column} style={styles.cell} />;
        const state = stateLabel(item);
        return <Pressable key={item.key} testID={`shop-item-${item.key}`} accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${rarityLabel[item.rarity]}, ${item.priceCoins} pièces${state ? `, ${state}` : ''}${!item.affordable ? ', Pas assez de pièces' : ''}`}
          accessibilityHint="Ouvrir la fiche de l’objet" onPress={() => onSelect(item.key)}
          style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
          <View style={[styles.product, { borderColor: rarityColor[item.rarity] }]}>
            <View style={styles.productHead}>
              <View style={[styles.rarityMark, { backgroundColor: rarityColor[item.rarity] }]} />
              <Text style={styles.category}>{categoryLabel(item)}</Text>
              {item.kind === 'EQUIPMENT' && item.owned && item.unlocked && <Text style={styles.owned}>✓</Text>}
            </View>
            <ShopStage item={item} size={shopArt.iconSize} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              {state && <Text style={styles.state}>{state}</Text>}
            </View>
            <View style={styles.price}>
              <CoinAmount amount={item.priceCoins} />
              <Text style={styles.priceArrow}>›</Text>
            </View>
          </View>
        </Pressable>;
      })}
    </View>)}
  </View>;
}

export function ShopItemDetails({ item, busy, onBuy }: { item: Listing; busy: boolean; onBuy(): void }) {
  const control = purchaseControl(item);
  return <View style={styles.details}>
    <ShopStage item={item} size={shopArt.detailIconSize} expanded />
    <View style={styles.detailIdentity}>
      <Text style={styles.detailName} accessibilityRole="header">{item.name}</Text>
      <Text style={styles.category}>{categoryLabel(item)} · Niveau {item.minimumLevel}</Text>
    </View>
    {item.modifiers.length > 0 && <View style={styles.effects}>
      {item.modifiers.map((modifier, index) => <Text key={index} style={styles.effect}>{formatModifier(modifier)}</Text>)}
    </View>}
    <View style={styles.purchaseRow}>
      <Text style={styles.category}>PRIX</Text>
      <CoinAmount amount={item.priceCoins} />
    </View>
    <Button label={control.label} busy={busy} disabled={control.disabled}
      accessibilityLabel={control.disabled ? control.label : `Acheter — ${item.name}, ${item.priceCoins} pièces`} onPress={onBuy} />
  </View>;
}

export function ShopPurchaseReceipt({ purchase, onContinue }: {
  purchase: components['schemas']['Purchase']; onContinue(): void;
}) {
  return <View style={styles.details} accessibilityLiveRegion="polite">
    <ShopStage item={purchase.item} size={shopArt.detailIconSize} expanded />
    <View style={styles.detailIdentity}>
      <Text style={styles.success}>✓  Dans ton sac</Text>
      <Text style={styles.detailName} accessibilityRole="header">{purchase.item.name}</Text>
    </View>
    <View style={styles.purchaseRow}>
      <Text style={styles.category}>Dépensé</Text>
      <CoinAmount amount={purchase.spentCoins} />
    </View>
    <Button label="Continuer mes achats" onPress={onContinue} />
  </View>;
}

const styles = StyleSheet.create({
  catalog: { gap: space.md },
  stage: { height: shopArt.stageHeight, alignItems: 'center', justifyContent: 'center' },
  illustration: { marginBottom: space.md },
  featuredStage: { flex: 1, height: shopArt.featuredHeight },
  detailStage: { height: shopArt.detailHeight },
  featured: { flexDirection: 'row', alignItems: 'center', minHeight: shopArt.featuredHeight },
  featuredInfo: { flex: 1, paddingVertical: space.lg, paddingRight: space.md, gap: space.sm },
  eyebrow: { ...type.label, color: color.accent, fontFamily: typography.display.semibold },
  featuredName: { color: color.text, fontSize: shopArt.titleSize, fontFamily: typography.display.bold },
  category: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  discover: { ...type.label, color: color.accent, fontFamily: typography.display.semibold, marginTop: space.xs },
  filters: { flexDirection: 'row', gap: space.sm },
  filter: { flex: 1, minHeight: control.backSize, alignItems: 'center', justifyContent: 'center',
    borderWidth: control.borderWidth, borderColor: color.border, borderRadius: control.radius, backgroundColor: color.surface },
  filterActive: { borderColor: color.accent, backgroundColor: color.surfaceRaised },
  filterLabel: { ...type.label, color: color.textMuted, fontFamily: typography.display.semibold, letterSpacing: 0 },
  activeLabel: { color: color.accent },
  filterLight: { position: 'absolute', bottom: 0, width: control.accentWidth, height: control.accentHeight, backgroundColor: color.accent },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionTitle: { ...type.body, fontFamily: typography.display.semibold, color: color.text },
  rule: { height: frame.standard.borderWidth, flex: 1, backgroundColor: color.border },
  count: { ...type.label, color: color.textMuted },
  row: { flexDirection: 'row', gap: shopArt.cardGap, alignItems: 'stretch' },
  cell: { flex: 1, minWidth: 0 },
  product: { flex: 1, borderWidth: frame.standard.borderWidth, borderRadius: frame.standard.radius,
    backgroundColor: shopArt.cardSurface, overflow: 'hidden' },
  productHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, padding: space.sm },
  rarityMark: { width: space.xs, height: space.xs, transform: [{ rotate: '45deg' }] },
  owned: { ...type.label, color: color.gain, marginLeft: 'auto' },
  productInfo: { paddingHorizontal: space.sm, paddingBottom: space.sm, gap: space.xs, flex: 1 },
  productName: { ...type.body, fontFamily: typography.display.semibold, color: color.text, minHeight: shopArt.nameHeight },
  state: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  price: { minHeight: shopArt.priceHeight, paddingHorizontal: space.sm, backgroundColor: shopArt.priceSurface,
    borderTopWidth: frame.standard.borderWidth, borderTopColor: shopArt.coinBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  priceArrow: { ...type.title, color: color.coin },
  empty: { padding: space.lg },
  details: { gap: space.md },
  detailIdentity: { alignItems: 'center', gap: space.sm },
  detailName: { ...type.title, fontFamily: typography.display.bold, color: color.text, textAlign: 'center' },
  effects: { borderLeftWidth: frame.segmentThickness, borderLeftColor: color.accent,
    padding: space.md, gap: space.sm, backgroundColor: color.surfaceRaised },
  effect: { ...type.body, color: color.text },
  success: { ...type.body, color: color.gain, fontFamily: typography.display.semibold },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: space.md, backgroundColor: shopArt.coinSurface, borderWidth: frame.standard.borderWidth, borderColor: shopArt.coinBorder },
  pressed: { opacity: opacity.pressed, transform: [{ scale: shopArt.pressedScale }] },
});
