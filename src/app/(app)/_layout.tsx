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
      {/* « Spike SyncSummary » nommait le banc de fixtures, du temps où l'accueil n'était
          que ça. L'écran montre maintenant le niveau et les séances du joueur, et le vieux
          titre le faisait passer pour un écran de débogage — au point qu'on y cherchait un
          bouton retour. */}
      <Stack.Screen name="index" options={{ title: 'GRRIND' }} />
      <Stack.Screen name="sante" options={{ title: 'Santé' }} />
      <Stack.Screen name="reward" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}
