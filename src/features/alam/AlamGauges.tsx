import { Text, View } from 'react-native';
import type { components } from '@/api/schema';
import { attributeLabel } from '@/design/tokens';
import { alamStyles as s } from './styles';

export function AlamGauges({ gauges }: { gauges: components['schemas']['AlamGauge'][] }) {
  return <View style={s.group}>{gauges.map((gauge) => <View key={gauge.attribute} style={s.group}
    accessibilityLabel={`${attributeLabel[gauge.attribute]} : ${gauge.current} sur ${gauge.target}`}>
    <View style={s.row}><Text style={s.body}>{attributeLabel[gauge.attribute]}</Text>
      <Text style={s.muted}>{gauge.current} / {gauge.target}</Text></View>
    <View style={s.track}><View style={[s.fill, { width: `${Math.min(100, Math.max(0, gauge.progressPermille / 10))}%` }]} /></View>
  </View>)}</View>;
}
