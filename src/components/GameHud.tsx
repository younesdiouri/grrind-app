import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { CoinIcon } from '@/components/CoinIcon';
import { color, control, frame, gameHud, opacity, space, type, typography } from '@/design/tokens';

export type HudDestination = 'shop' | 'workshop' | 'bag' | 'inventory';
const SHORTCUTS = { workshop: 'Atelier', bag: 'Sac', inventory: 'Inventaire' } as const;

/** Navigation de jeu sans titre de page ; le shell fournit le solde et les destinations. */
export function GameHud({ coins, active, onNavigate, onBack, shopPulse }: {
  coins?: number; active?: HudDestination; onNavigate(target: HudDestination): void;
  onBack?(): void; shopPulse?: ReactNode;
}) {
  const compact = coins !== undefined && coins >= gameHud.compactFrom;
  return <View style={styles.row} accessibilityRole="toolbar">
    {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack}
      testID="hud-back" style={({ pressed }) => [styles.button, styles.back, pressed && styles.pressed]}>
      <Text style={styles.backGlyph}>‹</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel={coins === undefined ? 'Boutique, solde indisponible' : `Boutique, ${coins} pièces`}
      aria-selected={active === 'shop'} onPress={() => onNavigate('shop')} testID="hud-shop"
      style={({ pressed }) => [styles.button, styles.shop, active === 'shop' && styles.shopActive, pressed && styles.pressed]}>
      {shopPulse}
      <View style={styles.balance} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <CoinIcon size={gameHud.coinSize} />
        <Text style={[styles.coins, compact && styles.compactCoins]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={gameHud.minimumFontScale}>
          {coins === undefined ? '···' : coins.toLocaleString('fr-FR', compact ? { notation: 'compact', maximumFractionDigits: 1 } : undefined)}
        </Text>
      </View>
      <View style={[styles.edge, { backgroundColor: color.coin }]} />
    </Pressable>
    {(Object.keys(SHORTCUTS) as (keyof typeof SHORTCUTS)[]).map((key) => <Pressable key={key}
      testID={`hud-${key}`} accessibilityRole="button" accessibilityLabel={SHORTCUTS[key]}
      aria-selected={active === key} onPress={() => onNavigate(key)}
      style={({ pressed }) => [styles.button, active === key && { borderColor: gameHud[key], backgroundColor: color.surfaceRaised }, pressed && styles.pressed]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <HudIcon name={key} />
      </View>
      <View style={[styles.edge, { backgroundColor: gameHud[key] }]} />
    </Pressable>)}
  </View>;
}

/** Silhouettes autonomes et colorées : fiole, sac de loot et buste de personnage. */
export function HudIcon({ name, size = gameHud.iconSize }: { name: keyof typeof SHORTCUTS; size?: number }) {
  const ink = { stroke: color.background, strokeWidth: 1.4, strokeLinejoin: 'round' as const };
  return <Svg width={size} height={size} viewBox="0 0 32 32">
    {name === 'workshop' ? <>
      <Path d="M12 4h8v7l7 10a5 5 0 0 1-4 8H9a5 5 0 0 1-4-8l7-10Z" fill={color.surfaceRaised} stroke={gameHud.workshop} strokeWidth="1.5" />
      <Path d="m9 19 4-3 6 3 4-2 3 6a3 3 0 0 1-3 4H9a3 3 0 0 1-3-4Z" fill={gameHud.workshop} />
      <Rect x="11" y="3" width="10" height="5" rx="1" fill={color.coin} {...ink} />
      <Path d="m10 22 2-3m1-8v3" stroke={color.text} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="20" cy="22" r="1.5" fill={color.text} />
    </> : name === 'bag' ? <>
      <Path d="M11 10V6a5 5 0 0 1 10 0v4" fill="none" stroke={gameHud.bag} strokeWidth="3" />
      <Path d="m7 9-3 8 1 10q11 5 22 0l1-10-3-8Z" fill={gameHud.bag} {...ink} />
      <Path d="M7 10h18l-2 9H9Z" fill={color.surfaceRaised} {...ink} />
      <Path d="M7 23v3m18-3v3" stroke={color.text} strokeOpacity="0.5" strokeWidth="2" />
      <Rect x="13" y="15" width="6" height="7" rx="1" fill={color.coin} {...ink} />
      <Path d="M16 17v3" stroke={color.background} />
    </> : <>
      <Circle cx="16" cy="16" r="14" fill={color.surfaceRaised} stroke={gameHud.inventory} strokeWidth="1.2" />
      <Path d="M5 27v-4q2-7 11-7t11 7v4q-11 7-22 0Z" fill={gameHud.inventory} {...ink} />
      <Path d="m12 18 4 5 4-5" fill="none" stroke={color.background} strokeWidth="2" />
      <Ellipse cx="16" cy="11" rx="6" ry="7" fill={color.coinHighlight} {...ink} />
      <Path d="M10 11V8q1-6 7-5 6 0 6 7l-6-3-7 4Z" fill={color.textMuted} {...ink} />
      <Path d="M13 12h1m4 0h1" stroke={color.background} strokeWidth="1.8" strokeLinecap="round" />
    </>}
  </Svg>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs },
  button: { width: control.backSize, height: control.backSize, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface, borderWidth: control.borderWidth, borderColor: gameHud.rim,
    borderRadius: frame.standard.radius, overflow: 'hidden' },
  back: { borderColor: color.border },
  backGlyph: { ...type.title, color: color.text, fontFamily: typography.display.semibold },
  shop: { flex: 1, minWidth: 0, backgroundColor: gameHud.shopSurface, borderColor: gameHud.shopBorder, boxShadow: gameHud.shopShadow },
  shopActive: { borderColor: color.coin },
  balance: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, width: '100%' },
  coins: { ...type.body, color: color.coin, fontFamily: typography.display.semibold, fontWeight: typography.display.weight.semibold, flexShrink: 1 },
  compactCoins: { fontSize: type.label.fontSize },
  edge: { position: 'absolute', bottom: 0, alignSelf: 'center', width: space.md, height: frame.segmentThickness },
  pressed: { opacity: opacity.pressed, transform: [{ scale: gameHud.pressedScale }] },
});
