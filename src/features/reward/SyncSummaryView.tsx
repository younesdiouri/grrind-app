import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AmbientBackdrop } from '@/components/AmbientBackdrop';
import { AnimatedCoinBalance } from '@/components/AnimatedCoinBalance';
import { ItemCard } from '@/components/ItemCard';
import { StreakMeter, streakHeroCount } from '@/components/StreakMeter';
import { SystemFrame } from '@/components/SystemFrame';
import { TitleBadge } from '@/components/TitleBadge';
import { TogetherDetails } from '@/components/TogetherDetails';
import { togetherGroups, type TogetherStatus } from '@/features/health/together';
import { XpBar, xpBarFill } from '@/components/XpBar';
import {
  ambient,
  attributeColor,
  attributeLabel,
  color,
  curve,
  duration,
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
 * **Page 3 — la série** (#182), seulement si un jour sportif a compté : avant → après, puis le
 * coffre de la semaine s'il tombe. Sa propre page, et pas sous le butin : après un retour de
 * vacances, dix objets la poussaient hors de l'écran et le coffre se révélait sans témoin.
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
  const pages = (['xp', 'loot', 'streak'] as const).filter(
    (name) => name === 'xp' || (name === 'loot' ? hasLoot : gains.streak !== null),
  );
  const [page, setPage] = useState<Page>('xp');
  const next = pages[pages.indexOf(page) + 1];
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
    if (next !== undefined) {
      setPage(next);
      return;
    }
    onDismiss?.();
  };

  return (
    <Pressable style={styles.screen} onPress={touch} onLayout={play}>
      <AmbientBackdrop />
      <View style={styles.frame}>
        <SystemFrame tier="event" style={styles.frame} contentStyle={styles.content}>
          {page === 'xp' ? <XpPage gains={gains} progress={progress} together={summary.imported.map((workout) => workout.session.together)} /> : null}
          {page === 'loot' ? <LootPage gains={gains} /> : null}
          {page === 'streak' && gains.streak !== null ? <StreakPage streak={gains.streak} /> : null}

          {done && onDismiss !== undefined ? (
            <Text style={styles.exit}>
              {next === undefined ? 'Toucher pour continuer' : `Toucher pour voir ${NEXT_LABEL[next]}`}
            </Text>
          ) : null}
        </SystemFrame>
      </View>
    </Pressable>
  );
}

type Page = 'xp' | 'loot' | 'streak';

const NEXT_LABEL: Record<Page, string> = { xp: 'l’XP', loot: 'le butin', streak: 'la série' };

type Progress = ReturnType<typeof useSharedValue<number>>;

function XpPage({ gains, progress, together }: { gains: BatchGains; progress: Progress; together: (TogetherStatus | undefined)[] }) {
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
    <ScrollView style={styles.page} contentContainerStyle={styles.lootContent}>
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
      {togetherGroups(together).map((group, index) => <View key={index}>
        <Text style={styles.label}>{group.count} séance{group.count > 1 ? 's' : ''}</Text>
        <TogetherDetails together={group.together} />
      </View>)}

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
    </ScrollView>
  );
}

function LootPage({ gains }: { gains: BatchGains }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.lootContent}>
      <Text style={styles.heading}>BUTIN</Text>
      {gains.loot.map((item, position) => (
        <ItemCard key={`${item.key}-${position}`} item={item} />
      ))}
      {gains.coins.after > gains.coins.before ? (
        <View style={styles.purse}>
          <Text style={styles.label}>BOURSE</Text>
          <AnimatedCoinBalance before={gains.coins.before} after={gains.coins.after} />
          <Text style={styles.coinGain}>+{gains.coins.after - gains.coins.before}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

/**
 * Après les pièces : la série court de l'avant à l'après, puis le coffre se révèle. Une seule
 * valeur sur le thread UI — `[0, 1]` pour le compteur, `[1, 2]` pour le coffre.
 */
function StreakPage({ streak }: { streak: NonNullable<BatchGains['streak']> }) {
  const { before, after, chests } = streak;
  const progress = useSharedValue(0);

  const play = () => {
    progress.value = withDelay(
      duration.settle,
      withTiming(1, { duration: duration.settle, easing: Easing.bezier(...curve.enter) }, (finished) => {
        'worklet';
        if (finished !== true || chests.length === 0) {
          return;
        }
        progress.value = withTiming(2, {
          duration: duration.drop,
          easing: Easing.bezier(...curve.celebrate),
        });
        scheduleOnRN(Haptics.notificationAsync, Haptics.NotificationFeedbackType.Success);
      }),
    );
  };

  const daysProps = useAnimatedProps(() => {
    const value = Math.round(before.days + (after.days - before.days) * Math.min(1, progress.value));
    const text = `${value}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  const chestStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1, 1.4], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(progress.value, [1, 2], [0.6, 1], 'clamp') }],
  }));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.lootContent} onLayout={play}>
      <StreakMeter
        state={after}
        size="hero"
        fresh={Math.max(0, after.sportDaysInLast7 - before.sportDaysInLast7)}
        days={
          <AnimatedTextInput
            style={[styles.streakDays, streakHeroCount]}
            editable={false}
            animatedProps={daysProps}
            defaultValue={`${before.days}`}
          />
        }
      />
      {chests.length > 0 ? (
        <Animated.View style={[styles.lootContent, chestStyle]}>
          <Text style={[styles.label, styles.climb]}>COFFRE DE LA SEMAINE</Text>
          {chests.map((chest, position) => (
            <ItemCard key={`${chest.key}-${position}`} item={chest} />
          ))}
        </Animated.View>
      ) : null}
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
  streakDays: { ...type.title, color: color.accent, padding: 0 },
  exit: { ...type.body, color: color.text, textAlign: 'center' },
});
