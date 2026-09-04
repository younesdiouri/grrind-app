import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SystemBackButton } from '@/components/SystemBackButton';
import { color, frame, navigation, space, type, typography } from '@/design/tokens';

/** En-tête React complet : iOS ne peut pas réhabiller la commande retour en capsule native. */
export function SystemHeader({ title, canGoBack }: { title: string; canGoBack: boolean }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.rail} pointerEvents="none" />
      <View style={styles.row}>
        {canGoBack ? <SystemBackButton /> : <View style={styles.backPlaceholder} />}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: color.background,
    borderBottomColor: color.border,
    borderBottomWidth: frame.standard.borderWidth,
  },
  rail: {
    position: 'absolute',
    bottom: -frame.standard.borderWidth,
    left: space.lg,
    width: frame.hero.accentLength,
    height: frame.segmentThickness,
    backgroundColor: color.accent,
  },
  row: {
    minHeight: navigation.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  backPlaceholder: { width: navigation.headerHeight - space.sm },
  title: {
    ...type.body,
    color: color.text,
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.display.semibold,
    fontWeight: typography.display.weight.semibold,
  },
});
