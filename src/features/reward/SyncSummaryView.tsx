import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AmbientBackdrop } from '@/components/AmbientBackdrop';
import { AnimatedCoinBalance } from '@/components/AnimatedCoinBalance';
import { ItemCard } from '@/components/ItemCard';
import { SystemFrame } from '@/components/SystemFrame';
import { TitleBadge } from '@/components/TitleBadge';
import { XpBar, xpBarFill } from '@/components/XpBar';
import {
  ambient,
  attributeColor,
  attributeLabel,
  color,
  curve,
  space,
  type,
  typography,
  xpNoCreditReasonLabel,
} from '@/design/tokens';
import { batchGains, type BatchGains } from './gains';
import type { SyncSummary } from './timeline';

/**
 * L'écran de récompense, en deux pages et sans séquenceur.
 *
 * **Page 1 — l'XP.** Un seul compteur, une seule barre qui court du palier de départ du lot à
 * son palier d'arrivée, niveaux franchis compris. Puis ce que le lot a apporté, en chiffres :
 * les titres, et le gain de chaque caractéristique. Les séances ne se rejouent pas une par une —
 * c'est ce qui rendait l'écran illisible dès la deuxième.
 *
 * **Page 2 — le butin**, seulement s'il y en a : les objets tombés et la bourse.
 *
 * Les séances écartées ne s'affichent plus : elles n'ont rien rapporté, il n'y a rien à fêter.
 *
 * Rien n'est calculé ici au sens du jeu : chaque nombre vient du résumé serveur (`totals`, les
 * `gained`, les avant/après), `gains.ts` ne fait que les additionner sur le lot.
 */
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** La course de la barre et du compteur. Plus longue qu'un `settle` : c'est le temps fort. */
const RUN_MS = 1600;

export function SyncSummaryView({
  summary,
  onDismiss,
}: {
  summary: SyncSummary;
  onDismiss?: () => void;
}) {
  const gains = batchGains(summary);
  const hasLoot = gains.loot.length > 0 || gains.coins.after > gains.coins.before;
  const [page, setPage] = useState<'xp' | 'loot'>('xp');
  const [done, setDone] = useState(false);
  const progress = useSharedValue(0);

  // Au `onLayout` et pas dans un effet : la règle du compilateur interdit d'écrire ensuite
  // dans une valeur qu'un effet a touchée, et le saut a besoin d'y écrire.
  const play = () => {
    progress.value = withTiming(
      1,
      { duration: RUN_MS, easing: Easing.bezier(...curve.enter) },
      (finished) => {
        'worklet';
        if (finished === true) {
          scheduleOnRN(setDone, true);
        }
      },
    );
  };

  const touch = () => {
    if (!done) {
      cancelAnimation(progress);
      progress.value = 1;
      setDone(true);
      return;
    }
    if (page === 'xp' && hasLoot) {
      setPage('loot');
      return;
    }
    onDismiss?.();
  };

  return (
    <Pressable style={styles.screen} onPress={touch} onLayout={play}>
      <AmbientBackdrop />
      <View style={styles.frame}>
        <SystemFrame tier="event" style={styles.frame} contentStyle={styles.content}>
          {page === 'xp' ? (
            <XpPage gains={gains} progress={progress} />
          ) : (
            <LootPage gains={gains} />
          )}

          {done && onDismiss !== undefined ? (
            <Text style={styles.exit}>
              {page === 'xp' && hasLoot ? 'Toucher pour voir le butin' : 'Toucher pour continuer'}
            </Text>
          ) : null}
        </SystemFrame>
      </View>
    </Pressable>
  );
}

type Progress = ReturnType<typeof useSharedValue<number>>;

function XpPage({ gains, progress }: { gains: BatchGains; progress: Progress }) {
  const { totals, bar } = gains;
  const xp = totals?.xpAwarded ?? 0;

  // Un choc par niveau franchi : le seul retour vers JS de la course.
  useAnimatedReaction(
    () => Math.floor(bar.start + (bar.end - bar.start) * progress.value),
    (crossed, previous) => {
      if (previous !== null && crossed > previous) {
        scheduleOnRN(Haptics.notificationAsync, Haptics.NotificationFeedbackType.Success);
      }
    },
  );

  const barStyle = useAnimatedStyle(() => {
    const position = bar.start + (bar.end - bar.start) * progress.value;
    const fill = progress.value >= 1 ? bar.endFill : position - Math.floor(position);
    return { width: `${fill * 100}%` };
  });

  const counterProps = useAnimatedProps(() => {
    const text = `+${Math.round(xp * progress.value)} XP`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  if (totals === null) {
    return (
      <View style={styles.page}>
        <Text style={[styles.counter, styles.quiet]}>+0 XP</Text>
        <Text style={styles.label}>Aucune séance comptée</Text>
      </View>
    );
  }

  const climbed = totals.levelAfter > totals.levelBefore;

  return (
    <View style={styles.page}>
      <AnimatedTextInput
        style={[styles.counter, xp === 0 && styles.quiet]}
        editable={false}
        animatedProps={counterProps}
        defaultValue="+0 XP"
      />
      <XpBar size="hero">
        <Animated.View style={[xpBarFill, barStyle]} />
      </XpBar>

      <Text style={styles.label}>
        NIVEAU{' '}
        <Text style={climbed ? styles.climb : styles.stay}>
          {climbed ? `${totals.levelBefore} → ${totals.levelAfter}` : totals.levelAfter}
        </Text>
        {'   ·   '}
        {totals.workoutCount} séance{totals.workoutCount > 1 ? 's' : ''}
      </Text>

      {gains.noCredit === null ? null : (
        <Text style={styles.label}>{xpNoCreditReasonLabel[gains.noCredit].toUpperCase()}</Text>
      )}

      {gains.titles.map((title) => (
        <TitleBadge key={title.id} name={title.name} caption="Titre débloqué" />
      ))}

      <View style={styles.attributes}>
        {gains.attributes.map(({ attribute, gained }) => (
          <View key={attribute} style={styles.attributeRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: attribute === 'vitality' ? color.text : attributeColor[attribute] },
              ]}
            />
            <Text style={styles.attributeName}>{attributeLabel[attribute]}</Text>
            <Text style={styles.attributeGain}>
              {gained > 0 ? '+' : ''}
              {gained}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LootPage({ gains }: { gains: BatchGains }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.lootContent}>
      <Text style={styles.heading}>BUTIN</Text>
      {gains.loot.map((item, position) => (
        <ItemCard key={`${item.key}-${position}`} item={item} />
      ))}
      <View style={styles.purse}>
        <Text style={styles.label}>BOURSE</Text>
        <AnimatedCoinBalance before={gains.coins.before} after={gains.coins.after} />
        <Text style={styles.coinGain}>+{gains.coins.after - gains.coins.before}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: space.sm, overflow: 'hidden' },
  frame: { flex: 1, zIndex: ambient.contentLayer },
  content: { flex: 1, padding: space.lg, gap: space.md },
  page: { flex: 1, gap: space.md },
  counter: {
    ...type.display,
    color: color.accent,
    padding: 0,
    fontFamily: typography.display.bold,
    fontWeight: typography.display.weight.bold,
  },
  quiet: { color: color.textMuted },
  label: { ...type.label, color: color.textMuted },
  heading: { ...type.title, color: color.text },
  climb: { color: color.celebrate },
  stay: { color: color.text },
  attributes: { gap: space.sm, marginTop: space.md },
  attributeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: space.sm, height: space.sm, borderRadius: space.xs },
  attributeName: { ...type.body, color: color.text, flex: 1 },
  attributeGain: { ...type.title, color: color.gain },
  lootContent: { gap: space.md },
  purse: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  coinGain: { ...type.body, color: color.gain },
  exit: { ...type.body, color: color.text, textAlign: 'center' },
});
