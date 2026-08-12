import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { color } from '@/design/tokens';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
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
    </>
  );
}
