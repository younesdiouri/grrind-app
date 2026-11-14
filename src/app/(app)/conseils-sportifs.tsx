import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { space } from '@/design/tokens';
import { WeekTrainingPlansView } from '@/features/progression/WeekTrainingPlan';
import { useWeekTrainingPlan } from '@/features/progression/useWeekTrainingPlan';

export default function TrainingSuggestionsScreen() {
  const query = useWeekTrainingPlan();
  return <>
    <Stack.Screen options={{ title: 'Tes sports du jour' }} />
    <ScrollView contentContainerStyle={styles.screen}>
      <WeekTrainingPlansView week={query.data} now={query.now} loading={query.isPending}
        failure={query.error} refreshing={query.isFetching && !query.isPending}
        onRetry={() => { void query.refetch(); }} onGuide={() => router.push('/sports')} onBack={() => router.back()} />
    </ScrollView>
  </>;
}

const styles = StyleSheet.create({ screen: { padding: space.lg } });
