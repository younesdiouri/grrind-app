import { useId, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Svg, Text as SvgText } from 'react-native-svg';

import { SystemFrame } from '@/components/SystemFrame';
import { color, disciplineLabel, palette, radius, space, type, typography, workoutChart as chart } from '@/design/tokens';
import { compactDuration, dateRange, shortDate, statsPeriodLabel, type WorkoutStats } from '@/features/progression/workoutStats';

const GRADE_COLORS = { A: color.gain, B: color.accent, C: palette.amethyst, D: palette.copper, E: color.textMuted };
const GRADE_LABELS = { A: 'Volume en hausse', B: 'Rythme maintenu', C: 'Léger recul', D: 'Rythme allégé', E: 'Peu de volume' };

export function WorkoutStatsView({ stats, trainingPlan }: { stats: WorkoutStats; trainingPlan?: ReactNode }) {
  return <View style={styles.stack}>
    <EffortCard stats={stats} />
    <View style={styles.metrics}>
      <Metric value={String(stats.current.length)} label="SÉANCES" />
      <Metric value={String(stats.activeDays)} label="JOURS ACTIFS" detail={`sur ${stats.days} jours`} />
      <Metric value={stats.current.length ? compactDuration(stats.averageSeconds) : '—'} label="PAR SÉANCE" detail="durée moyenne" />
    </View>
    {stats.current.length > 0 ? trainingPlan : null}
    <VolumeChart key={`volume-${stats.period}`} stats={stats} />
    {stats.period === 'year' ? <YearCalendar stats={stats} /> : <ActivityCalendar key={`calendar-${stats.period}`} stats={stats} />}
    <DisciplineBalance key={`balance-${stats.period}`} stats={stats} />
  </View>;
}

function Metric({ value, label, detail }: { value: string; label: string; detail?: string }) {
  return <View style={styles.metric}>
    <Text style={styles.metricValue} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
    <Text style={styles.micro}>{label}</Text>{detail ? <Text style={styles.caption}>{detail}</Text> : null}
  </View>;
}

function EffortCard({ stats }: { stats: WorkoutStats }) {
  const [explained, setExplained] = useState(false);
  const tint = stats.grade ? GRADE_COLORS[stats.grade] : color.textMuted;
  const gradeIndex = stats.grade ? ['E', 'D', 'C', 'B', 'A'].indexOf(stats.grade) + 1 : 0;
  const circumference = 2 * Math.PI * chart.donutRadius;
  return <SystemFrame tier="hero" contentStyle={styles.panel}>
    <View style={styles.sectionHead}>
      <Text style={styles.overline}>EFFORT SCORE</Text><Text style={styles.tag}>VOLUME · {statsPeriodLabel[stats.period].toUpperCase()}</Text>
    </View>
    <View style={styles.heroBody}>
      <View style={styles.gradeDial}>
        <Svg width={chart.donutSize} height={chart.donutSize} viewBox={`0 0 ${chart.donutSize} ${chart.donutSize}`}>
          <Circle cx={chart.donutCenter} cy={chart.donutCenter} r={chart.donutRadius} stroke={color.border} strokeWidth={chart.donutStroke} fill="none" />
          <Circle cx={chart.donutCenter} cy={chart.donutCenter} r={chart.donutRadius} stroke={tint} strokeWidth={chart.donutStroke}
            strokeDasharray={`${Math.max(0, gradeIndex / 5 * circumference - space.xs)} ${circumference}`} strokeLinecap="round" rotation={-90}
            origin={`${chart.donutCenter}, ${chart.donutCenter}`} fill="none" />
        </Svg>
        <View style={styles.dialCenter}><Text style={[styles.grade, { color: tint }]}>{stats.grade ?? '—'}</Text></View>
      </View>
      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>{stats.grade ? GRADE_LABELS[stats.grade] : 'Ta référence se construit'}</Text>
        <Text style={styles.total}>{compactDuration(stats.seconds)}</Text>
        <Text style={[styles.delta, { color: stats.change !== null && stats.change >= 0 ? color.gain : color.textMuted }]}>
          {stats.change === null ? 'Pas de volume sur la période précédente' : `${stats.change > 0 ? '+' : ''}${stats.change} % de temps d’entraînement`}
        </Text>
      </View>
    </View>
    <View style={styles.gradeScale} accessibilityLabel="Échelle de volume de E à A">
      {(['E', 'D', 'C', 'B', 'A'] as const).map(grade => <View key={grade} style={[styles.gradeStep, { borderColor: stats.grade === grade ? GRADE_COLORS[grade] : color.border }]}>
        <Text style={[styles.caption, { color: stats.grade === grade ? GRADE_COLORS[grade] : color.textMuted }]}>{grade}</Text>
      </View>)}
    </View>
    <Pressable onPress={() => setExplained(value => !value)} accessibilityRole="button" accessibilityState={{ expanded: explained }} style={styles.explainButton}>
      <Text style={styles.caption}>Comparé au {dateRange(stats.previousStart, stats.previousEnd)}{stats.period === 'year' ? ` ${stats.previousStart.getFullYear()}` : ''}</Text>
      <Text style={styles.link}>{explained ? 'Fermer −' : 'Le calcul +'} </Text>
    </Pressable>
    {explained ? <Text style={styles.note}>Le score compare la durée totale des séances synchronisées à la période précédente : A ≥ 120 %, B ≥ 100 %, C ≥ 80 %, D ≥ 50 %, E en dessous. Sans volume précédent, aucune note. Il décrit le volume, pas l’intensité, la récupération ou la qualité de tes séances.</Text> : null}
  </SystemFrame>;
}

function VolumeChart({ stats }: { stats: WorkoutStats }) {
  const [selected, setSelected] = useState(stats.buckets.filter(bucket => !bucket.isFuture).length - 1);
  const gradient = `volume-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const max = Math.max(120, ...stats.buckets.map(bucket => bucket.seconds));
  const plotWidth = chart.chartRight - chart.chartLeft;
  const plotHeight = chart.chartBottom - chart.chartTop;
  const points = stats.buckets.map((bucket, index) => ({
    x: chart.chartLeft + index / Math.max(1, stats.buckets.length - 1) * plotWidth,
    y: chart.chartBottom - bucket.seconds / max * plotHeight,
  }));
  const observed = points.filter((_, index) => !stats.buckets[index].isFuture);
  const line = observed.map((p, index) => `${index ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const bucket = stats.buckets[selected];
  const selectedPoint = points[selected];
  return <SystemFrame contentStyle={styles.panel}>
    <View style={styles.sectionHead}><Text style={styles.overline}>TEMPS D’ENTRAÎNEMENT</Text><Text style={styles.tag}>{stats.period === 'year' ? 'PAR MOIS' : 'PAR JOUR'}</Text></View>
    <View style={styles.sectionHead}>
      <Text style={styles.chartValue}>{compactDuration(bucket.seconds)}</Text>
      <Text style={styles.note}>{stats.period === 'year' ? bucket.from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : shortDate(bucket.from)}</Text>
    </View>
    <View style={styles.plot}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${chart.width} ${chart.chartHeight}`}>
        <Defs><LinearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={color.accent} stopOpacity={chart.fillOpacity * 2} /><Stop offset="1" stopColor={color.accent} stopOpacity="0" /></LinearGradient></Defs>
        {[0, .5, 1].map(tick => <Line key={tick} x1={chart.chartLeft} x2={chart.chartRight} y1={chart.chartTop + tick * plotHeight} y2={chart.chartTop + tick * plotHeight} stroke={color.border} strokeDasharray="3 5" />)}
        {[0, .5, 1].map(tick => <SvgText key={`scale-${tick}`} x="0" y={chart.chartTop + tick * plotHeight + space.xs}
          fill={color.textMuted} fontSize={chart.labelSize}>{compactDuration(max * (1 - tick))}</SvgText>)}
        <Path d={`${line} L ${observed[observed.length - 1].x} ${chart.chartBottom} L ${observed[0].x} ${chart.chartBottom} Z`} fill={`url(#${gradient})`} />
        <Path d={line} stroke={color.accent} strokeWidth={chart.stroke * 2} strokeLinejoin="round" fill="none" />
        <Line x1={selectedPoint.x} x2={selectedPoint.x} y1={chart.chartTop} y2={chart.chartBottom} stroke={color.accent} opacity={chart.gridOpacity} strokeDasharray="2 4" />
        {observed.map((p, index) => <Circle key={index} cx={p.x} cy={p.y} r={chart.dot} fill={color.accent} />)}
        <Circle cx={selectedPoint.x} cy={selectedPoint.y} r={chart.dot * 2} fill={color.surface} stroke={color.accent} strokeWidth={chart.stroke} />
        {stats.period === 'month' ? null : stats.buckets.map((item, index) => <SvgText key={`axis-${index}`} x={points[index].x} y={chart.chartBottom + space.md + space.xs}
          textAnchor="middle" fill={color.textMuted} fontSize={chart.labelSize}>{item.axisLabel}</SvgText>)}
      </Svg>
      <View style={styles.plotTouch}>
        {stats.buckets.map((item, index) => <Pressable key={index} style={styles.plotTarget} onPress={() => setSelected(index)} disabled={item.isFuture}
          accessibilityRole="button" accessibilityLabel={`${dateRange(item.from, item.to)}, ${item.isFuture ? 'à venir' : compactDuration(item.seconds)}`} accessibilityState={{ selected: index === selected, disabled: item.isFuture }} />)}
      </View>
    </View>
    <Text style={styles.caption}>Toucher pour explorer</Text>
  </SystemFrame>;
}

function YearCalendar({ stats }: { stats: WorkoutStats }) {
  const [selected, setSelected] = useState(stats.buckets.filter(bucket => !bucket.isFuture).length - 1);
  const month = stats.buckets[selected];
  return <SystemFrame contentStyle={styles.panel}>
    <View style={styles.sectionHead}><Text style={styles.overline}>RÉGULARITÉ</Text><Text style={styles.tag}>JOURS ACTIFS / MOIS</Text></View>
    <Text style={styles.note}>{month.from.toLocaleDateString('fr-FR', { month: 'long' })} · {month.activeDays} jours actifs · {compactDuration(month.seconds)}</Text>
    <View style={styles.months}>
      {stats.buckets.map((item, index) => <Pressable key={index} style={[styles.month, selected === index && styles.monthSelected]} onPress={() => setSelected(index)} disabled={item.isFuture}
        accessibilityRole="button" accessibilityLabel={`${item.axisLabel}, ${item.isFuture ? 'à venir' : `${item.activeDays} jours actifs`}`} accessibilityState={{ selected: selected === index, disabled: item.isFuture }}>
        <Text style={styles.micro}>{item.axisLabel}</Text><Text style={[styles.monthValue, item.activeDays > 0 && styles.monthActive]}>{item.isFuture ? '—' : item.activeDays}</Text>
      </Pressable>)}
    </View>
  </SystemFrame>;
}

function ActivityCalendar({ stats }: { stats: WorkoutStats }) {
  const [selected, setSelected] = useState(stats.daily.length - 1);
  const day = stats.daily[Math.min(selected, stats.daily.length - 1)];
  const columns = Math.min(chart.calendarColumns, stats.daily.length);
  const rows = Math.ceil(stats.daily.length / columns);
  const width = columns * chart.calendarStep;
  return <SystemFrame contentStyle={styles.panel}>
    <View style={styles.sectionHead}><Text style={styles.overline}>RÉGULARITÉ</Text><Text style={styles.tag}>{stats.activeDays} J ACTIFS</Text></View>
    <Text style={styles.note}>{shortDate(day.date)} · {day.sessions ? `${day.sessions} séance${day.sessions > 1 ? 's' : ''} · ${compactDuration(day.seconds)}` : 'Aucune séance synchronisée'}</Text>
    <View style={styles.calendarRows}>
      {Array.from({ length: rows }, (_, row) => <View key={row} style={styles.calendarRow}>
        {stats.daily.slice(row * columns, (row + 1) * columns).map((item, column) => {
          const index = row * columns + column;
          return <Pressable key={index} style={styles.calendarTarget} onPress={() => setSelected(index)} accessibilityRole="button"
            accessibilityLabel={`${shortDate(item.date)}, ${item.sessions} séances, ${compactDuration(item.seconds)}`} accessibilityState={{ selected: selected === index }}>
            <Svg width="100%" height={chart.minimumTouch} viewBox={`0 0 ${width / columns} ${chart.minimumTouch}`}>
              <Rect x={(chart.calendarStep - chart.calendarCell) / 2} y={(chart.minimumTouch - chart.calendarCell) / 2} width={chart.calendarCell} height={chart.calendarCell} rx={space.xs}
                fill={item.sessions ? color.accent : chart.calendarIdle}
                stroke={selected === index ? color.text : item.sessions ? color.accent : chart.calendarIdleBorder} strokeWidth={chart.stroke} />
            </Svg>
          </Pressable>;
        })}
      </View>)}
    </View>
    <View style={styles.sectionHead}><Text style={styles.caption}>{shortDate(stats.daily[0].date)}</Text><Text style={styles.caption}>{shortDate(stats.daily[stats.daily.length - 1].date)}</Text></View>
  </SystemFrame>;
}

function DisciplineBalance({ stats }: { stats: WorkoutStats }) {
  const [selected, setSelected] = useState<number | null>(null);
  const circumference = 2 * Math.PI * chart.donutRadius;
  const selectedDiscipline = selected === null ? null : stats.disciplines[selected] ?? null;
  return <SystemFrame contentStyle={styles.panel}>
    <View style={styles.sectionHead}><Text style={styles.overline}>TON ÉQUILIBRE</Text><Text style={styles.tag}>TEMPS PAR SPORT</Text></View>
    <View style={styles.balanceHead}>
      <View style={styles.gradeDial}>
        <Svg width={chart.donutSize} height={chart.donutSize} viewBox={`0 0 ${chart.donutSize} ${chart.donutSize}`}>
          <Circle cx={chart.donutCenter} cy={chart.donutCenter} r={chart.donutRadius} stroke={color.border} strokeWidth={chart.donutStroke} fill="none" />
          {stats.disciplines.map((item, index) => {
            const start = stats.disciplines.slice(0, index).reduce((sum, part) => sum + part.share, 0) * circumference;
            return <Circle key={item.discipline} cx={chart.donutCenter} cy={chart.donutCenter} r={chart.donutRadius}
              stroke={chart.chartColors[index % chart.chartColors.length]} strokeWidth={chart.donutStroke} fill="none"
              strokeDasharray={`${Math.max(0, item.share * circumference - space.xs)} ${circumference}`} strokeDashoffset={-start}
              rotation={-90} origin={`${chart.donutCenter}, ${chart.donutCenter}`} opacity={selected === null || selected === index ? 1 : chart.gridOpacity} />;
          })}
        </Svg>
        <View style={styles.dialCenter}><Text style={styles.chartValue}>{selectedDiscipline ? `${Math.round(selectedDiscipline.share * 100)} %` : stats.disciplines.length}</Text><Text style={styles.micro}>{selectedDiscipline ? 'DU TEMPS' : 'SPORTS'}</Text></View>
      </View>
      <View style={styles.heroCopy}>
        {selectedDiscipline ? <>
          <Text style={styles.heroTitle}>{disciplineLabel[selectedDiscipline.discipline]}</Text>
          <Text style={styles.note}>{compactDuration(selectedDiscipline.seconds)} · {selectedDiscipline.sessions} séance{selectedDiscipline.sessions > 1 ? 's' : ''}</Text>
        </> : <Text style={styles.total}>{compactDuration(stats.seconds)}</Text>}
      </View>
    </View>
    {stats.disciplines.map((item, index) => <Pressable key={item.discipline} style={styles.sportRow} onPress={() => setSelected(selected === index ? null : index)} accessibilityRole="button" accessibilityState={{ selected: selected === index }}
      accessibilityLabel={`${disciplineLabel[item.discipline]}, ${Math.round(item.share * 100)} pour cent du temps, ${compactDuration(item.seconds)}, ${item.sessions} séances`}>
      <View style={styles.sectionHead}><Legend tint={chart.chartColors[index % chart.chartColors.length]} label={disciplineLabel[item.discipline]} /><Text style={styles.sportValue}>{Math.round(item.share * 100)} %</Text></View>
      <View style={styles.sportTrack}><View style={[styles.sportFill, { width: `${item.share * 100}%`, backgroundColor: chart.chartColors[index % chart.chartColors.length] }]} /></View>
      <Text style={styles.caption}>{compactDuration(item.seconds)} · {item.sessions} séance{item.sessions > 1 ? 's' : ''}</Text>
    </Pressable>)}
  </SystemFrame>;
}

function Legend({ tint, label }: { tint: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: tint }]} /><Text style={styles.note}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  panel: { padding: space.md, gap: space.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  overline: { ...type.label, color: color.text, fontFamily: typography.display.semibold, flexShrink: 1 },
  tag: { ...type.label, fontSize: chart.labelSize, color: color.accent, letterSpacing: 0 },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  gradeDial: { width: chart.donutSize, height: chart.donutSize },
  dialCenter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  grade: { fontSize: chart.gradeSize, fontFamily: typography.display.bold },
  heroCopy: { flex: 1, gap: space.sm },
  heroTitle: { ...type.body, color: color.text, fontFamily: typography.display.semibold },
  total: { ...type.title, color: color.text, fontFamily: typography.display.semibold },
  delta: { ...type.label, letterSpacing: 0 },
  gradeScale: { flexDirection: 'row', gap: space.xs },
  gradeStep: { flex: 1, borderTopWidth: space.xs, paddingTop: space.xs, alignItems: 'center' },
  explainButton: { minHeight: chart.minimumTouch, justifyContent: 'center', gap: space.xs },
  metrics: { flexDirection: 'row', gap: space.sm },
  metric: { flex: 1, backgroundColor: color.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border, borderRadius: radius.sm, padding: space.sm, gap: space.xs, minWidth: 0 },
  metricValue: { ...type.title, fontSize: chart.valueSize + space.sm, color: color.text, fontFamily: typography.display.semibold },
  micro: { ...type.label, fontSize: chart.labelSize, letterSpacing: 0, color: color.textMuted },
  note: { ...type.label, letterSpacing: 0, color: color.textMuted, flexShrink: 1 },
  caption: { ...type.label, fontSize: chart.labelSize, letterSpacing: 0, color: color.textMuted },
  link: { ...type.label, color: color.accent },
  chartValue: { ...type.title, color: color.accent, fontFamily: typography.display.semibold },
  plot: { height: chart.chartHeight },
  plotTouch: { position: 'absolute', top: 0, bottom: 0, left: `${chart.chartLeft / chart.width * 100}%`, right: `${(chart.width - chart.chartRight) / chart.width * 100}%`, flexDirection: 'row' },
  plotTarget: { flex: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 1 },
  legendDot: { width: space.sm, height: space.sm, borderRadius: space.xs },
  months: { flexDirection: 'row', flexWrap: 'wrap' },
  month: { width: '25%', minHeight: chart.minimumTouch, padding: space.sm, alignItems: 'center', gap: space.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  monthSelected: { borderColor: color.accent },
  monthValue: { ...type.body, color: color.textMuted, fontFamily: typography.display.semibold },
  monthActive: { color: color.accent },
  calendarRows: { gap: 0 },
  calendarRow: { flexDirection: 'row' },
  calendarTarget: { flex: 1, minHeight: chart.minimumTouch },
  balanceHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sportRow: { paddingVertical: space.sm, gap: space.xs, minHeight: chart.minimumTouch },
  sportValue: { ...type.body, color: color.text, fontFamily: typography.display.semibold },
  sportTrack: { height: space.xs, borderRadius: radius.pill, backgroundColor: color.surfaceRaised },
  sportFill: { height: '100%', borderRadius: radius.pill },
});
