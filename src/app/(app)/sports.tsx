import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { space } from '@/design/tokens';
import { SportsGuideView } from '@/features/progression/SportsGuideView';
import { useSportsCatalog } from '@/features/progression/useSportsCatalog';

export default function SportsScreen() {
  const [search, setSearch] = useState('');
  const catalog = useSportsCatalog();
  return <>
    <Stack.Screen options={{ title: 'Guide des sports' }} />
    <ScrollView contentContainerStyle={styles.screen} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      <SportsGuideView catalog={catalog.data} search={search} onSearch={setSearch}
        loading={catalog.isPending} failure={catalog.error} refreshing={catalog.isFetching && !catalog.isPending}
        onRetry={() => { void catalog.refetch(); }} />
    </ScrollView>
  </>;
}

const styles = StyleSheet.create({ screen: { padding: space.lg } });
