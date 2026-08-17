import { StyleSheet, Text, View } from 'react-native';

import { fillOf } from '@/components/guildCapacity';
import { color, radius, space, type } from '@/design/tokens';

type CapacityGaugeProps = {
  memberCount: number;
  /**
   * La capacité de la guilde — **toujours celle de la réponse**, jamais une valeur que
   * l'app fige. `Guild.capacity` vient de l'équilibrage du serveur : le jour où il change,
   * ce composant n'a rien à republier.
   */
  capacity: number;
};

/**
 * « 12 / 30 » : le nombre de membres, et la place qu'il en reste.
 *
 * La piste se remplit à la fraction `memberCount / capacity`, **calculée à l'affichage**, ce
 * qui évite l'autre tentation — dessiner une rangée de cases dont le nombre supposerait la
 * capacité. Rien ici ne dessine 30 de quoi que ce soit.
 */
export function CapacityGauge({ memberCount, capacity }: CapacityGaugeProps) {
  const fill = fillOf(memberCount, capacity);

  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(fill * 100)}%` }]} />
      </View>
      <Text style={styles.count}>
        {memberCount} / {capacity}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: {
    flex: 1,
    height: space.xs,
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: color.accent, borderRadius: radius.pill },
  count: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
