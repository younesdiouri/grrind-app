import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DisciplineChip } from '@/components/DisciplineChip';
import { SystemFrame } from '@/components/SystemFrame';
import { XpBar } from '@/components/XpBar';
import {
  attributeColor,
  attributeLabel,
  color,
  radius,
  space,
  type,
  typography,
  type Attribute,
} from '@/design/tokens';
import { formatDuration, formatWhen } from '@/features/progression/format';
import { formatCountdown, gaugeOf, type WeekEntry, type WeekProgress } from '@/features/progression/week';

const ATTRIBUTES: Attribute[] = ['strength', 'endurance', 'mobility', 'dexterity'];

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
  renderFill = staticFill,
}: {
  week: WeekProgress;
  now: Date;
  /**
   * Le remplissage d'une jauge, à `fill` entre 0 et 1. Statique par défaut — les previews se
   * rendent dans Node, sans Reanimated ; l'accueil fournit le sien, animé (même porte
   * qu'`XpBar.children`).
   */
  renderFill?: (fill: number, tint: string) => ReactNode;
}) {
  const { current, previous } = week;

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
        {ATTRIBUTES.map((attribute) => (
          <Gauge
            key={attribute}
            attribute={attribute}
            current={current.attributes[attribute]}
            previous={previous === null ? null : previous.attributes[attribute]}
            renderFill={renderFill}
          />
        ))}
      </View>

      {week.entries.length === 0 ? (
        <Text style={styles.muted}>Aucune séance cette semaine : synchronise Santé, la prochaine remplira ces jauges.</Text>
      ) : (
        <View style={styles.entries}>
          <Text style={styles.overline}>D’OÙ VIENNENT TES POINTS</Text>
          {week.entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} now={now} />
          ))}
        </View>
      )}
    </SystemFrame>
  );
}

function Gauge({
  attribute,
  current,
  previous,
  renderFill,
}: {
  attribute: Attribute;
  current: number;
  previous: number | null;
  renderFill: (fill: number, tint: string) => ReactNode;
}) {
  const gauge = gaugeOf(current, previous);
  const label = attributeLabel[attribute];
  const tint = attributeColor[attribute];

  return (
    <View
      style={styles.gauge}
      accessible
      accessibilityLabel={
        previous === null
          ? `${label} ${current} cette semaine`
          : `${label} ${current} sur ${previous} la semaine dernière${gauge.beaten ? ', battue' : ''}`
      }
    >
      <View style={styles.gaugeHead}>
        <Text style={[styles.gaugeLabel, { color: tint }]}>{label.toUpperCase()}</Text>
        <Text style={styles.gaugeValue}>
          {current}
          {previous === null ? '' : <Text style={styles.muted}> / {previous}</Text>}
        </Text>
      </View>
      {previous === null ? null : (
        <XpBar>{renderFill(gauge.fill, tint)}</XpBar>
      )}
      {gauge.remaining === null ? null : gauge.beaten ? (
        <Text style={styles.beaten}>
          BATTUE{current > (previous ?? 0) ? ` · +${current - (previous ?? 0)}` : ''}
        </Text>
      ) : (
        <Text style={styles.muted}>encore {gauge.remaining}</Text>
      )}
    </View>
  );
}

function staticFill(fill: number, tint: string) {
  return <View style={[gaugeFill, { width: `${Math.round(fill * 100)}%`, backgroundColor: tint }]} />;
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
  beaten: { ...type.label, color: color.gain },
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

/** Le fond d'une jauge, pour qui l'anime lui-même. Voir `renderFill`. */
export const gaugeFill = { height: '100%', borderRadius: radius.pill } as const;
