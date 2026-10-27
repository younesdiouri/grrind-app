import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameHud, type HudDestination } from '@/components/GameHud';
import { openHudDestination } from '@/components/hudNavigation';
import { ShopPulse } from '@/components/SystemMotion';
import { decorativeMotion } from '@/design/decorativeMotion';
import { color, frame } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { useInventory } from '@/features/inventory/useInventory';

/** Même HUD sur les onglets et la pile ; aucune copie du solde ou du titre de page. */
export function SystemHeader({ canGoBack }: { canGoBack: boolean }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { section } = useGlobalSearchParams<{ section?: string }>();
  const inventory = useInventory();
  const pulse = decorativeMotion('shopPulse', useReducedMotion());
  const active: HudDestination | undefined = pathname === '/boutique' ? 'shop'
    : pathname === '/atelier' ? 'workshop'
      : pathname === '/inventaire' ? section === 'bag' ? 'bag' : 'inventory' : undefined;
  return <View style={[styles.header, { paddingTop: insets.top }]}>
    <GameHud coins={inventory.data?.coins} active={active} onNavigate={(target) => openHudDestination(target, canGoBack, router)}
      onBack={canGoBack ? () => router.back() : undefined}
      shopPulse={pulse.effect !== undefined && active !== 'shop' ? <ShopPulse /> : undefined} />
  </View>;
}

const styles = StyleSheet.create({
  header: { backgroundColor: color.background, borderBottomColor: color.border, borderBottomWidth: frame.standard.borderWidth },
});
