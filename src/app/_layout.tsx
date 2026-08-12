import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { color } from '@/design/tokens';
import { restore } from '@/features/auth/session';
import { useAuth } from '@/features/auth/useAuth';

// L'écran de démarrage tient jusqu'à ce que le trousseau ait répondu. Sans ça, l'app
// afficherait l'écran de connexion une fraction de seconde avant de le remplacer par
// l'accueil — un clignotement à chaque ouverture, pour une session parfaitement valide.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const auth = useAuth();

  useEffect(() => {
    // En développement, React monte deux fois : le coordinateur de rafraîchissement partage
    // sa promesse, donc il ne part quand même qu'un seul appel.
    void restore();
  }, []);

  useEffect(() => {
    if (auth.status !== 'restoring') {
      void SplashScreen.hideAsync();
    }
  }, [auth.status]);

  if (auth.status === 'restoring') {
    return null;
  }

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
        {/* Le garde ne protège pas les données — le serveur s'en charge — mais la
            navigation : un lien profond vers un écran connecté retombe sur la connexion,
            et la bascule de `status` déplace l'app toute seule, sans `router.replace`
            dispersé dans les écrans. */}
        <Stack.Protected guard={auth.status === 'signedIn'}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={auth.status === 'signedOut'}>
          <Stack.Screen name="login" options={{ title: 'Connexion' }} />
          <Stack.Screen name="register" options={{ title: 'Créer un compte' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
