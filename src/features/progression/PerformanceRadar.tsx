import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, Line, Path, Polygon, Svg } from 'react-native-svg';

import { attributeColor, attributeLabel, color, space, type, typography, workoutChart as chart, type Attribute } from '@/design/tokens';
import { WEEK_ATTRIBUTES, weekPercent, weekPercentLabel, type WeekProgress } from '@/features/progression/week';

export type RadarPoint = { x: number; y: number };
export const radarPoints = (values: readonly number[]): RadarPoint[] => values.map((value, index) => {
  const angle = index * Math.PI / 2 - Math.PI / 2;
  return { x: chart.centerX + Math.cos(angle) * chart.radarRadius * value,
    y: chart.centerY + Math.sin(angle) * chart.radarRadius * value };
});
export const pointsString = (points: RadarPoint[]) => points.map(({ x, y }) => `${x},${y}`).join(' ');

/** Les deux semaines partagent une échelle ; dépasser 100 % agrandit le repère entier. */
export function PerformanceRadar({ week, renderShape, renderReference }: {
  week: WeekProgress;
  renderShape?: (points: RadarPoint[]) => ReactNode;
  renderReference?: (points: RadarPoint[]) => ReactNode;
}) {
  const percents = WEEK_ATTRIBUTES.map(attribute => weekPercent(week.current.attributes[attribute], week.previous?.attributes[attribute] ?? null));
  const scale = Math.max(100, ...percents.map(value => value ?? 0));
  const points = radarPoints(percents.map(value => (value ?? 0) / scale));
  const axes = radarPoints([1, 1, 1, 1]);
  const labels = WEEK_ATTRIBUTES.map(attribute => weekPercentLabel(week.current.attributes[attribute], week.previous?.attributes[attribute] ?? null));
  const reference = radarPoints([1, 1, 1, 1].map(value => value * 100 / scale));
  const positions = WEEK_ATTRIBUTES.map((_, index) => {
    const angle = index * Math.PI / 2 - Math.PI / 2;
    return { x: chart.centerX + Math.cos(angle) * chart.radarIconOffset - chart.radarIcon / 2,
      y: chart.centerY + Math.sin(angle) * chart.radarIconOffset - chart.radarIcon / 2 };
  });

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
        {week.previous === null ? null : renderReference ? renderReference(reference) : <Polygon points={pointsString(reference)}
          stroke={color.textMuted} strokeDasharray="3 5" opacity={chart.gridOpacity} fill="none" />}
        {renderShape ? renderShape(points) : <Polygon points={pointsString(points)} fill={color.accent} fillOpacity={chart.fillOpacity} stroke={color.accent} strokeWidth={chart.stroke} />}
        {points.map((point, index) => <Circle key={index} cx={point.x} cy={point.y} r={chart.dot} fill={attributeColor[WEEK_ATTRIBUTES[index]]} />)}
        <Circle cx={chart.centerX} cy={chart.centerY} r={chart.stroke} fill={color.textMuted} />
        {positions.map((position, index) => <RadarIcon key={index} attribute={WEEK_ATTRIBUTES[index]} {...position} />)}
      </Svg>
    </View>
  );
}

const ICON_PATH: Record<Attribute, string> = {
  strength: 'M6 5v14M3 8v8M18 5v14M21 8v8M6 12h12',
  endurance: 'M12 21C8 18 3 14 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5-5 9-9 12M5 12h4l2-4 3 7 2-3h3',
  mobility: 'M12 8v7m0-4L5 8m7 3 7-3m-7 7-6 6m6-6 6 6',
  dexterity: 'M13 2 5 14h6l-1 8 9-13h-6z',
};

function RadarIcon({ attribute, x, y }: { attribute: Attribute; x: number; y: number }) {
  return <Svg x={x} y={y} width={chart.radarIcon} height={chart.radarIcon} viewBox="0 0 24 24">
    <Path d={ICON_PATH[attribute]} stroke={attributeColor[attribute]} strokeWidth={chart.stroke * 1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {attribute === 'mobility' ? <Circle cx="12" cy="4" r="2" fill={attributeColor[attribute]} /> : null}
  </Svg>;
}

const styles = StyleSheet.create({
  radar: { gap: space.xs },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.label, color: color.text, fontFamily: typography.display.semibold },
  signal: { width: space.xs, height: space.xs, borderRadius: space.xs, backgroundColor: color.accent },
  svg: { aspectRatio: chart.width / chart.radarHeight },
});
