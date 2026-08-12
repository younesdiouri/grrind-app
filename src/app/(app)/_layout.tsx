import { Stack } from 'expo-router';

import { color } from '@/design/tokens';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: color.background },
        headerTintColor: color.text,
        contentStyle: { backgroundColor: color.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Spike RewardSummary' }} />
      <Stack.Screen name="reward" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
