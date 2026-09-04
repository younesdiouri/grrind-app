import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SystemBackButton } from '@/components/SystemBackButton';
import { Caret, SparkRail } from '@/components/SystemMotion';
import { decorativeMotion } from '@/design/decorativeMotion';
import { color, frame, motion, navigation, space, type, typography } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';

/**
 * En-tête React complet : iOS ne peut pas réhabiller la commande retour en capsule native.
 *
 * ————— Il porte désormais deux des trois ponctuations (#159) ————————————————————————————
 *
 * Un curseur à côté du titre, et un point courant sur le filet d'accent. Avec le losange de la
 * barre d'onglets, ce sont les seuls mouvements visibles sur **tous** les écrans : ils disent que
 * l'app tourne même quand l'écran est vide, et ils ne disent rien d'autre — aucune information
 * ne passe par eux, l'arbre d'accessibilité ne les voit pas.
 *
 * C'est aussi pour eux que les onglets sont passés à cet en-tête plutôt qu'à celui de React
 * Navigation : le filet d'accent est ici, et le curseur n'aurait eu nulle part où vivre.
 */
export function SystemHeader({ title, canGoBack }: { title: string; canGoBack: boolean }) {
  const insets = useSafeAreaInsets();
  const beacon = decorativeMotion('beacon', useReducedMotion());

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      {beacon.effect === undefined ? (
        <View style={styles.rail} pointerEvents="none" />
      ) : (
        <SparkRail style={styles.rail} offset={motion.beacon.phase.header} />
      )}
      <View style={styles.row}>
        {canGoBack ? <SystemBackButton /> : <View style={styles.backPlaceholder} />}
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {beacon.effect === undefined ? null : <Caret />}
        </View>
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
  /**
   * Le titre garde sa place centrée, le curseur se pose à sa droite. Le `flexShrink` reste sur
   * le texte seul : c'est lui qui doit céder sur un titre long, jamais le curseur, dont la
   * largeur est celle d'un caractère et se lirait comme un défaut si elle variait.
   */
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  title: {
    ...type.body,
    color: color.text,
    flexShrink: 1,
    textAlign: 'center',
    fontFamily: typography.display.semibold,
    fontWeight: typography.display.weight.semibold,
  },
});
