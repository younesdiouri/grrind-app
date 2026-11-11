import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { AmbientBackdrop } from '@/components/AmbientBackdrop';
import { color, duration, radius, space, type, typography, workoutChart } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { getSettledRevision, subscribeToSync } from '@/features/health/sync';
import { WorkoutRow } from '@/features/progression/PlayerHomeView';
import { WorkoutStatsView } from '@/features/progression/WorkoutStatsView';
import { useWorkoutStats } from '@/features/progression/useWorkoutStats';
import { summarizeWorkouts, type StatsDays } from '@/features/progression/workoutStats';

/**
 * L'archive des séances (#362), sortie de l'accueil : celui-ci dit la semaine, celle-ci tout le
 * reste. Paginée sur le `nextCursor` opaque de `/api/workouts`, renvoyé tel quel.
 */
export default function Historique() {
  const [mode, setMode] = useState<'stats' | 'journal'>('stats');
  return <View style={styles.shell}>
    <Stack.Screen options={{ title: 'Plus de stats' }} />
    <AmbientBackdrop />
    <View style={styles.header}>
      <Text style={styles.overline}>PERFORMANCE / WORKOUT</Text>
      <Text style={styles.title}>Ton entraînement.</Text>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(['stats', 'journal'] as const).map(tab => <Pressable key={tab} onPress={() => setMode(tab)} style={[styles.tab, mode === tab && styles.selectedTab]}
          accessibilityRole="tab" accessibilityState={{ selected: mode === tab }}>
          <Text style={[styles.tabLabel, mode === tab && styles.selectedLabel]}>{tab === 'stats' ? 'Vue d’ensemble' : 'Toutes les séances'}</Text>
        </Pressable>)}
      </View>
    </View>
    {mode === 'stats' ? <Dashboard /> : <WorkoutJournal />}
  </View>;
}

function Dashboard() {
  const [days, setDays] = useState<StatsDays>(28);
  const reduced = useReducedMotion();
  const now = new Date();
  const query = useWorkoutStats(days, now);
  return <ScrollView contentContainerStyle={styles.screen} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={color.accent} />}>
    <View style={styles.periods} accessibilityRole="tablist">
      {([7, 28, 84] as const).map(period => <Pressable key={period} style={[styles.period, days === period && styles.selectedPeriod]} onPress={() => setDays(period)} accessibilityRole="tab" accessibilityState={{ selected: days === period }}>
        <Text style={[styles.tabLabel, days === period && styles.selectedLabel]}>{period} jours</Text>
      </Pressable>)}
    </View>
    {query.isPending ? <View style={styles.loading}><ActivityIndicator color={color.accent} /><Text style={styles.muted}>Lecture de toutes tes séances…</Text></View> : null}
    {query.error ? <View style={styles.footer}><Text style={styles.muted}>{messageFor(query.error)}</Text><Button label="Réessayer" variant="quiet" onPress={() => void query.refetch()} /></View> : null}
    {query.data ? <Animated.View key={days} entering={reduced === false ? FadeInUp.duration(duration.enter) : undefined}>
      {query.data.length === 0 ? <Text style={styles.empty}>Tes premières séances dessineront ta trajectoire. Synchronise Santé depuis l’accueil pour les retrouver ici.</Text> : null}
      <WorkoutStatsView stats={summarizeWorkouts(query.data, days, now)} days={days} />
    </Animated.View> : null}
  </ScrollView>;
}

function WorkoutJournal() {
  const auth = useAuth();
  const revision = useSyncExternalStore(subscribeToSync, getSettledRevision);
  const history = useInfiniteQuery<components['schemas']['WorkoutPage'], Failure>({
    queryKey: ['workouts', auth.status === 'signedIn' ? auth.user.id : null, revision],
    enabled: auth.status === 'signedIn',
    queryFn: ({ pageParam }) =>
      queryOrFailure(() =>
        api.GET('/api/workouts', {
          params: { query: { limit: 20, cursor: pageParam as string | undefined } },
        }),
      ),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  // Une seule lecture de l'horloge pour toute la liste, comme sur l'accueil.
  const now = new Date();

  return (
    <>
      <FlatList
        contentContainerStyle={styles.screen}
        data={history.data?.pages.flatMap((page) => page.workouts) ?? []}
        keyExtractor={(workout) => workout.id}
        renderItem={({ item }) => <WorkoutRow workout={item} now={now} />}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
        }}
        ListEmptyComponent={
          history.isPending ? (
            <ActivityIndicator color={color.accent} />
          ) : history.isError ? null : (
            <Text style={styles.muted}>Aucune séance pour l’instant.</Text>
          )
        }
        ListFooterComponent={
          history.error ? (
            <View style={styles.footer}>
              <Text style={styles.muted}>{messageFor(history.error)}</Text>
              <Button
                label="Réessayer"
                variant="quiet"
                onPress={() => void (history.data ? history.fetchNextPage() : history.refetch())}
              />
            </View>
          ) : history.isFetchingNextPage ? (
            <ActivityIndicator color={color.accent} />
          ) : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  screen: { padding: space.lg, gap: space.md },
  title: { ...type.title, fontFamily: typography.display.bold, color: color.text },
  overline: { ...type.label, color: color.accent },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  tab: { flex: 1, minHeight: workoutChart.minimumTouch, alignItems: 'center', justifyContent: 'center', borderBottomWidth: space.xs, borderColor: 'transparent' },
  selectedTab: { borderColor: color.accent },
  tabLabel: { ...type.label, color: color.textMuted, fontFamily: typography.display.semibold },
  selectedLabel: { color: color.accent },
  periods: { flexDirection: 'row', padding: space.xs, borderRadius: radius.sm, backgroundColor: color.surface, gap: space.xs },
  period: { flex: 1, minHeight: workoutChart.minimumTouch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  selectedPeriod: { backgroundColor: color.surfaceRaised },
  loading: { paddingVertical: space.xl, alignItems: 'center', gap: space.md },
  footer: { gap: space.sm },
  muted: { ...type.body, color: color.textMuted, textAlign: 'center' },
  empty: { ...type.body, color: color.textMuted, marginBottom: space.md },
});
