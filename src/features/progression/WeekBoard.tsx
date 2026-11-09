import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DisciplineChip } from '@/components/DisciplineChip';
import { SystemFrame } from '@/components/SystemFrame';
import { XpBar } from '@/components/XpBar';
import {
  attributeColor,
  attributeHalo,
  attributeLabel,
  color,
  gaugeGlowShape,
  radius,
  space,
  type,
  typography,
  type Attribute,
} from '@/design/tokens';
import { formatDuration, formatWhen } from '@/features/progression/format';
import {
  formatCountdown,
  gaugeGlow,
  gaugeOf,
  priorityOf,
  type WeekEntry,
  type WeekProgress,
} from '@/features/progression/week';

const ATTRIBUTES: Attribute[] = ['strength', 'endurance', 'mobility', 'dexterity'];

/**
 * Ce qu'une jauge demande à dessiner : sa part, sa teinte (verte une fois chargée), son halo
 * — déjà dosé par `gaugeGlow`, `null` quand il est éteint — et si elle est la priorité.
 */
export type GaugeBar = { fill: number; tint: string; halo: string | null; pulse: boolean };

/**
 * La semaine de jeu (#362) : ce qu'il reste à remplir, puis d'où viennent les points.
 *
 * Tout est servi par `GET /api/progression/week` — les sommes, la référence de la semaine
 * d'avant, chaque écriture et sa répartition. Le client compare deux nombres pour dessiner une
 * jauge ; il n'en calcule aucun.
 */
export function WeekBoard({
  week,
  now,
  renderBar = StaticGaugeBar,
}: {
  week: WeekProgress;
  now: Date;
  /**
   * La barre d'une jauge. Statique par défaut — les previews se rendent dans Node, sans
   * Reanimated ; l'accueil fournit la sienne, qui se remplit et respire (même porte
   * qu'`XpBar.children`).
   */
  renderBar?: (bar: GaugeBar) => ReactNode;
}) {
  const { current, previous } = week;
  const [explained, setExplained] = useState(false);
  const gauges = ATTRIBUTES.map((attribute) =>
    gaugeOf(current.attributes[attribute], previous === null ? null : previous.attributes[attribute]),
  );
  const priority = priorityOf(gauges);

  return (
    <SystemFrame contentStyle={styles.board}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={styles.overline}>SEMAINE</Text>
          <Text style={styles.xp}>+{current.xp} XP</Text>
        </View>
        <View style={styles.headRight}>
          <Text style={styles.overline}>
            {current.sessions} SÉANCE{current.sessions > 1 ? 'S' : ''}
          </Text>
          <Text style={styles.muted}>Remise à zéro dans {formatCountdown(week.resetsAt, now)}</Text>
        </View>
      </View>

      {previous === null ? (
        <Text style={styles.muted}>Première semaine : elle deviendra ta référence à battre.</Text>
      ) : (
        <Text style={styles.muted}>Remplis chaque jauge pour battre ta semaine dernière.</Text>
      )}

      <View style={styles.gauges}>
        {ATTRIBUTES.map((attribute, index) => (
          <Gauge
            key={attribute}
            attribute={attribute}
            current={current.attributes[attribute]}
            previous={previous === null ? null : previous.attributes[attribute]}
            gauge={gauges[index]}
            priority={index === priority}
            renderBar={renderBar}
          />
        ))}
      </View>

      {week.entries.length === 0 ? (
        <Text style={styles.muted}>Aucune séance cette semaine : synchronise Santé, la prochaine remplira ces jauges.</Text>
      ) : (
        // Le détail se demande, il ne s'impose pas : les jauges sont le sujet de l'écran.
        <View style={styles.entries}>
          <Pressable
            onPress={() => setExplained((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: explained }}
            hitSlop={space.sm}
            style={styles.toggle}
          >
            <Text style={styles.toggleSign}>{explained ? '−' : '+'}</Text>
            <Text style={styles.overline}>D’OÙ VIENNENT TES POINTS</Text>
          </Pressable>
          {explained
            ? week.entries.map((entry) => <EntryRow key={entry.id} entry={entry} now={now} />)
            : null}
        </View>
      )}
    </SystemFrame>
  );
}

function Gauge({
  attribute,
  current,
  previous,
  gauge,
  priority,
  renderBar,
}: {
  attribute: Attribute;
  current: number;
  previous: number | null;
  gauge: ReturnType<typeof gaugeOf>;
  priority: boolean;
  renderBar: (bar: GaugeBar) => ReactNode;
}) {
  const label = attributeLabel[attribute];
  const tint = attributeColor[attribute];
  const heat = gaugeGlow(gauge.fill, gauge.beaten);
  const halo = gauge.beaten ? gaugeGlowShape.chargedHalo : attributeHalo[attribute];

  return (
    <View
      style={styles.gauge}
      accessible
      accessibilityLabel={
        previous === null
          ? `${label} ${current} cette semaine`
          : `${label} ${current} sur ${previous} la semaine dernière${gauge.beaten ? ', chargée' : priority ? ', priorité' : ''}`
      }
    >
      <View style={styles.gaugeHead}>
        <Text style={[styles.gaugeLabel, { color: tint }]}>{label.toUpperCase()}</Text>
        <Text style={styles.gaugeValue}>
          {current}
          {previous === null ? '' : <Text style={styles.muted}> / {previous}</Text>}
        </Text>
      </View>
      {previous === null
        ? null
        : renderBar({
            fill: gauge.fill,
            tint: gauge.beaten ? color.gain : tint,
            halo:
              heat <= 0
                ? null
                : `0 0 ${Math.round(heat * gaugeGlowShape.radius)}px ${gaugeGlowShape.spread}px ${halo}`,
            pulse: priority,
          })}
      {gauge.remaining === null ? null : gauge.beaten ? (
        <Text style={styles.charged}>CHARGÉE</Text>
      ) : (
        <Text style={[styles.muted, priority && { color: tint }]}>encore {gauge.remaining}</Text>
      )}
    </View>
  );
}

/** La barre sans mouvement : celle des previews. Le halo est dessiné, la respiration non. */
function StaticGaugeBar({ fill, tint, halo }: GaugeBar) {
  return (
    <View>
      {halo === null ? null : <View style={[gaugeHaloLayer, { boxShadow: halo }]} />}
      <XpBar>
        <View style={[gaugeFill, { width: `${Math.round(fill * 100)}%`, backgroundColor: tint }]} />
      </XpBar>
    </View>
  );
}

const REASON: Record<WeekEntry['reason'], string | null> = {
  SESSION_COMPLETED: null,
  SESSION_INVALIDATED: 'Séance annulée',
  TOGETHER_BONUS: 'Bonus ensemble',
};

/** Une écriture : la séance, ce qu'elle a rapporté, et sur quelles caractéristiques. */
function EntryRow({ entry, now }: { entry: WeekEntry; now: Date }) {
  const split = ATTRIBUTES.filter((attribute) => entry.attributes[attribute] !== 0);
  const positive = split.filter((attribute) => entry.attributes[attribute] > 0);
  const reason = REASON[entry.reason];

  return (
    <View style={styles.entry}>
      <View style={styles.entryHead}>
        <DisciplineChip discipline={entry.discipline} />
        <Text style={[styles.entryXp, entry.amount < 0 && styles.loss]}>
          {entry.amount > 0 ? '+' : ''}
          {entry.amount} XP
        </Text>
      </View>
      <Text style={styles.muted}>
        {[reason, formatWhen(entry.occurredAt, now), formatDuration(Math.abs(entry.durationSeconds))]
          .filter((part) => part !== null)
          .join(' · ')}
      </Text>
      {positive.length === 0 ? null : (
        <View style={styles.split}>
          {positive.map((attribute) => (
            <View
              key={attribute}
              style={{ flex: entry.attributes[attribute], backgroundColor: attributeColor[attribute] }}
            />
          ))}
        </View>
      )}
      {split.length === 0 ? null : (
        <Text style={styles.splitText}>
          {split.map((attribute, index) => (
            <Text key={attribute}>
              {index > 0 ? '  ' : ''}
              <Text style={{ color: attributeColor[attribute] }}>{attributeLabel[attribute]}</Text>
              {` ${entry.attributes[attribute] > 0 ? '+' : ''}${entry.attributes[attribute]}`}
            </Text>
          ))}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { padding: space.md, gap: space.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: space.sm },
  headLeft: { gap: space.xs },
  headRight: { alignItems: 'flex-end', gap: space.xs, flexShrink: 1 },
  overline: { ...type.label, color: color.textMuted },
  xp: { ...type.title, fontFamily: typography.display.semibold, color: color.accent },
  muted: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  gauges: { gap: space.md },
  gauge: { gap: space.xs },
  gaugeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  gaugeLabel: { ...type.label },
  gaugeValue: { ...type.body, fontFamily: typography.display.semibold, color: color.text },
  charged: { ...type.label, color: color.gain },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  toggleSign: { ...type.body, fontFamily: typography.display.semibold, color: color.accent },
  entries: { gap: space.md },
  entry: {
    gap: space.xs,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  entryXp: { ...type.body, fontFamily: typography.display.semibold, color: color.accent },
  loss: { color: color.loss },
  split: {
    flexDirection: 'row',
    height: space.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
    gap: StyleSheet.hairlineWidth,
  },
  splitText: { ...type.label, color: color.text, letterSpacing: 0 },
});

/** Le fond d'une jauge, pour qui l'anime lui-même. Voir `renderBar`. */
export const gaugeFill = { height: '100%', borderRadius: radius.pill } as const;

/**
 * Le calque du halo, **sous** la piste et hors de son masque : `XpBar` coupe ce qui déborde, un
 * halo posé sur le remplissage n'aurait jamais été vu.
 */
export const gaugeHaloLayer = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  borderRadius: radius.pill,
  backgroundColor: color.surfaceRaised,
} as const;
