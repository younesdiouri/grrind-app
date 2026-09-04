import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';

import { queryClient } from '@/api/queryClient';
import { color, typography } from '@/design/tokens';
import { restore } from '@/features/auth/session';
import { useAuth } from '@/features/auth/useAuth';
// Importé pour son seul effet de bord — voir son docblock : `setNotificationHandler` doit
// être en place avant qu'une notification arrive, donc au chargement du module et pas dans
// un effet.
import '@/features/notifications/foregroundHandler';
import { useNotificationResponseRouting } from '@/features/notifications/useNotificationResponseRouting';
import { beginLaunch, isLaunchSettled, subscribeToLaunch } from '@/features/reward/launch';

// L'écran de démarrage tient jusqu'à ce que le trousseau ait répondu. Sans ça, l'app
// afficherait l'écran de connexion une fraction de seconde avant de le remplacer par
// l'accueil — un clignotement à chaque ouverture, pour une session parfaitement valide.
//
// Il tient aussi, **borné**, le temps de savoir s'il y a une progression à jouer : c'est ce
// qui fait de l'animation le premier écran plutôt qu'un plein écran qui surgit une seconde
// après l'accueil. L'attente se glisse dans un écran déjà affiché au lieu de s'ajouter après.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const auth = useAuth();
  // Chargement runtime volontaire : aucune configuration native, et l'erreur d'une fonte ne
  // retient jamais le splash. Source : https://docs.expo.dev/versions/v57.0.0/sdk/font/#usage
  const [fontsLoaded, fontError] = useFonts({
    [typography.display.semibold]: require('../../assets/fonts/Oxanium-SemiBold.ttf'),
    [typography.display.bold]: require('../../assets/fonts/Oxanium-Bold.ttf'),
  });
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    // En développement, React monte deux fois : le coordinateur de rafraîchissement partage
    // sa promesse, donc il ne part quand même qu'un seul appel.
    void restore();
  }, []);

  // Avant la garde de session, volontairement : un tap peut lancer l'app ou arriver pendant
  // que le trousseau restaure encore, et `handleNotificationResponse` sait déjà mettre la
  // cible en attente dans ce cas (`pendingPushRoute.ts`, consommée par `(app)/_layout.tsx`
  // dès que `signedIn` arrive).
  useNotificationResponseRouting();

  // Un magasin externe plutôt qu'un `useState` : l'état du lancement est un fait du
  // processus, pas d'un composant, et l'écrire depuis un effet ferait rendre en cascade au
  // montage — ce que `react-hooks/set-state-in-effect` refuse à juste titre.
  const settled = useSyncExternalStore(subscribeToLaunch, isLaunchSettled);

  useEffect(() => {
    if (auth.status === 'restoring') {
      return;
    }

    // La pile connectée est rendue sous l'écran de démarrage, donc la synchronisation de
    // lancement est déjà partie quand on arrive ici. `beginLaunch` est idempotent.
    beginLaunch(auth.status === 'signedIn');
  }, [auth.status]);

  useEffect(() => {
    if (settled && fontsSettled) {
      void SplashScreen.hideAsync();
    }
  }, [fontsSettled, settled]);

  if (auth.status === 'restoring' || !fontsSettled) {
    return null;
  }

  return (
    // Un seul `QueryClient` pour tout le process (`api/queryClient.ts`) : React Query n'est
    // consommé pour l'instant que par l'onglet Guilde (#42), mais le fournisseur vit à la
    // racine plutôt que sous `(tabs)` pour qu'un futur écran hors onglets n'ait pas à le
    // redécouvrir.
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
