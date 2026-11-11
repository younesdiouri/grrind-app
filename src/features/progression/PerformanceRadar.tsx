import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, Line, Polygon, Svg, Text as SvgText } from 'react-native-svg';

import { attributeColor, attributeLabel, color, space, type, typography, workoutChart as chart } from '@/design/tokens';
import { WEEK_ATTRIBUTES, weekPercent, weekPercentLabel, type WeekProgress } from '@/features/progression/week';

export type RadarPoint = { x: number; y: number };
export const radarPoints = (values: readonly number[]): RadarPoint[] => values.map((value, index) => {
  const angle = index * Math.PI / 2 - Math.PI / 2;
  return { x: chart.centerX + Math.cos(angle) * chart.radarRadius * value,
    y: chart.centerY + Math.sin(angle) * chart.radarRadius * value };
});
export const pointsString = (points: RadarPoint[]) => points.map(({ x, y }) => `${x},${y}`).join(' ');

/** Les deux semaines partagent une échelle ; dépasser 100 % agrandit le repère entier. */
export function PerformanceRadar({ week, renderShape }: {
  week: WeekProgress;
  renderShape?: (points: RadarPoint[]) => ReactNode;
}) {
  const percents = WEEK_ATTRIBUTES.map(attribute => weekPercent(week.current.attributes[attribute], week.previous?.attributes[attribute] ?? null));
  const scale = Math.max(100, ...percents.map(value => value ?? 0));
  const points = radarPoints(percents.map(value => (value ?? 0) / scale));
  const axes = radarPoints([1, 1, 1, 1]);
  const labels = WEEK_ATTRIBUTES.map(attribute => weekPercentLabel(week.current.attributes[attribute], week.previous?.attributes[attribute] ?? null));
  const positions = [
    { x: chart.centerX, y: chart.labelTop, anchor: 'middle' as const },
    { x: chart.labelRight, y: chart.centerY - space.sm, anchor: 'start' as const },
    { x: chart.centerX, y: chart.labelBottom, anchor: 'middle' as const },
    { x: chart.labelLeft, y: chart.centerY - space.sm, anchor: 'end' as const },
  ];

  return (
    <View style={styles.radar} accessible accessibilityLabel={`Radar de performance. ${WEEK_ATTRIBUTES.map((attribute, index) => `${attributeLabel[attribute]} ${labels[index]}`).join(', ')}. 100 pour cent correspond à la semaine dernière.`}>
      <View style={styles.heading}>
        <Text style={styles.title}>RADAR DE PERFORMANCE</Text>
        <View style={styles.signal} />
      </View>
      <Svg width="100%" viewBox={`0 0 ${chart.width} ${chart.radarHeight}`} style={styles.svg}>
        {[0.25, 0.5, 0.75, 1].map(step => <Polygon key={step} points={pointsString(radarPoints([step, step, step, step]))}
          stroke={color.border} strokeWidth={chart.stroke} fill="none" />)}
        {axes.map((point, index) => <Line key={index} x1={chart.centerX} y1={chart.centerY} x2={point.x} y2={point.y} stroke={color.border} />)}
        {week.previous === null ? null : <Polygon points={pointsString(radarPoints([1, 1, 1, 1].map(value => value * 100 / scale)))}
          stroke={color.textMuted} strokeDasharray="3 5" opacity={chart.gridOpacity} fill="none" />}
        {renderShape ? renderShape(points) : <Polygon points={pointsString(points)} fill={color.accent} fillOpacity={chart.fillOpacity} stroke={color.accent} strokeWidth={chart.stroke} />}
        {points.map((point, index) => <Circle key={index} cx={point.x} cy={point.y} r={chart.dot} fill={attributeColor[WEEK_ATTRIBUTES[index]]} />)}
        <Circle cx={chart.centerX} cy={chart.centerY} r={chart.stroke} fill={color.textMuted} />
        {positions.map((position, index) => <SvgText key={index} x={position.x} y={position.y} textAnchor={position.anchor} fill={attributeColor[WEEK_ATTRIBUTES[index]]}
          fontFamily={typography.display.semibold} fontSize={chart.labelSize}>
          {attributeLabel[WEEK_ATTRIBUTES[index]].toUpperCase()}
        </SvgText>)}
        {positions.map((position, index) => <SvgText key={index} x={position.x} y={position.y + space.md + space.xs} textAnchor={position.anchor}
          fill={color.text} fontFamily={typography.display.semibold} fontSize={chart.valueSize}>{labels[index]}</SvgText>)}
      </Svg>
      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: color.accent }]} /><Text style={styles.note}>Cette semaine</Text>
        <View style={[styles.dot, { backgroundColor: color.textMuted }]} /><Text style={styles.note}>100 % = semaine passée</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  radar: { gap: space.xs },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.label, color: color.text, fontFamily: typography.display.semibold },
  signal: { width: space.xs, height: space.xs, borderRadius: space.xs, backgroundColor: color.accent },
  svg: { aspectRatio: chart.width / chart.radarHeight },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, flexWrap: 'wrap' },
  dot: { width: space.xs, height: space.xs, borderRadius: space.xs, marginLeft: space.xs },
  note: { ...type.label, fontSize: chart.labelSize, letterSpacing: 0, color: color.textMuted },
});
