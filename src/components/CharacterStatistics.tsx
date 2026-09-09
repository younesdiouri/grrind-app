import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { components } from '@/api/schema';
import { SystemFrame } from '@/components/SystemFrame';
import { attributeLabel, characterSheet, color, space, type, typography, type AttributeState } from '@/design/tokens';
import { attributeDetail, combatValue, type Fighter } from '@/features/inventory/statistics';

const attributeIcon: Record<AttributeState, string> = {
  strength: 'M4 8v8m3-11v14m10-14v14m3-11v8M7 12h10',
  endurance: 'M12 3a9 9 0 1 0 9 9M12 7v5l4 2M16 3h5v5',
  mobility: 'm13 3-7 11h6l-1 7 7-11h-6z',
  dexterity: 'M12 3v4m0 10v4M3 12h4m10 0h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  vitality: 'M12 20 4 12C-1 5 7 1 12 7c5-6 13-2 8 5z',
};

const combatStat: Record<keyof Fighter, { label: string; icon: string }> = {
  hp: { label: 'Points de vie', icon: attributeIcon.vitality },
  damage: { label: 'Dégâts', icon: 'm4 20 4-4m-3-3 6 6M8 16 19 5l1-1v5L11 18' },
  mitigationPercent: { label: 'Armure', icon: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z' },
  comboPercent: { label: 'Combo', icon: 'm3 7 5 5-5 5m8-10 5 5-5 5m8-10 3 5-3 5' },
  dodgePercent: { label: 'Esquive', icon: 'M3 12h15m-5-5 5 5-5 5M5 5h4M5 19h4' },
  maintenancePercent: { label: 'Maintien', icon: attributeIcon.endurance },
  criticalChancePercent: { label: 'Critique', icon: 'm12 2 2 7 8 3-8 2-2 8-3-8-7-2 7-3z' },
  guardPercent: { label: 'Garde', icon: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12l3 3 5-6' },
  criticalResistancePercent: { label: 'Résistance critique', icon: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12h8' },
  cooldownReductionPercent: { label: 'Célérité', icon: attributeIcon.mobility },
  precisionPercent: { label: 'Précision', icon: attributeIcon.dexterity },
};

/** Les deux profils lisent la même décision serveur ; aucun total ne se recompose ici. */
export function CharacterStatistics({ statistics }: { statistics: components['schemas']['PlayerStatistics'] }) {
  return (
    <View style={styles.sections} testID="character-statistics">
      <SystemFrame contentStyle={styles.frame}>
        <Text style={styles.heading}>Caractéristiques</Text>
        {(Object.keys(attributeLabel) as AttributeState[]).map((key) => (
          <StatisticRow key={key} id={`attribute-${key}`} icon={attributeIcon[key]}
            label={attributeLabel[key]} value={String(statistics.attributes[key].effective)}
            detail={attributeDetail(statistics.attributes[key])} />
        ))}
      </SystemFrame>
      <SystemFrame contentStyle={styles.frame}>
        <Text style={styles.heading}>Combat</Text>
        <Text style={styles.note}>Équipement compris</Text>
        {(Object.keys(combatStat) as (keyof Fighter)[]).map((key) => (
          <StatisticRow key={key} id={`stat-${key}`} {...combatStat[key]}
            value={combatValue(key, statistics.fighter[key])} />
        ))}
      </SystemFrame>
    </View>
  );
}

function StatisticRow({ id, label, value, detail, icon }: {
  id: string; label: string; value: string; detail?: string; icon: string;
}) {
  return (
    <View style={styles.row} testID={id} accessible accessibilityLabel={`${label}, ${value}${detail ? `, ${detail}` : ''}`}>
      <Svg width={characterSheet.iconSize} height={characterSheet.iconSize} viewBox="0 0 24 24" accessibilityElementsHidden>
        <Path d={icon} fill="none" stroke={color.accent} strokeWidth={characterSheet.iconStroke} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.note}>{detail}</Text> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: space.md },
  frame: { padding: space.md },
  heading: { ...type.title, color: color.text, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: characterSheet.rowMinHeight, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  copy: { flex: 1, gap: space.xs },
  label: { ...type.body, color: color.text },
  note: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  value: { ...type.body, fontFamily: typography.display.bold, color: color.text, fontVariant: ['tabular-nums'] },
});
