import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { WorkoutRow } from '@/features/progression/PlayerHomeView';

/**
 * L'archive des séances (#362), sortie de l'accueil : celui-ci dit la semaine, celle-ci tout le
 * reste. Paginée sur le `nextCursor` opaque de `/api/workouts`, renvoyé tel quel.
 */
export default function Historique() {
  const history = useInfiniteQuery<components['schemas']['WorkoutPage'], Failure>({
    queryKey: ['workouts'],
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
      <Stack.Screen options={{ title: 'Historique' }} />
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
  screen: { padding: space.lg, gap: space.md },
  footer: { gap: space.sm },
  muted: { ...type.body, color: color.textMuted, textAlign: 'center' },
});
