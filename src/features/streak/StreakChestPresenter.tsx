import * as Haptics from 'expo-haptics';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, Modal, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ItemCard } from '@/components/ItemCard';
import { SystemFrame } from '@/components/SystemFrame';
import { color, curve, duration, space, type } from '@/design/tokens';
import { getPending, subscribeToPending } from '@/features/reward/pending';
import { streakStore } from './checkIn';

/**
 * Le coffre de la semaine pointée 7/7 (#360). Il attend que la mise en scène de la synchro ait
 * rendu l'écran — c'est elle qui a pu monter son palier.
 */
export function StreakChestPresenter() {
  const { chest } = useSyncExternalStore(streakStore.subscribe, streakStore.getSnapshot);
  const pending = useSyncExternalStore(subscribeToPending, getPending);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setForeground(next === 'active'));
    return () => subscription.remove();
  }, []);

  if (chest === null || pending || !foreground) return null;
  return (
    <Modal visible transparent onRequestClose={streakStore.dismissChest}>
      <SafeAreaView style={styles.screen}>
        <SystemFrame tier="event" contentStyle={styles.content}>
          <Text style={styles.label}>SEMAINE COMPLÈTE</Text>
          <Text style={styles.heading}>Coffre de la semaine</Text>
          <Reveal>
            <ItemCard item={chest} expanded />
          </Reveal>
          <Text style={styles.body}>Il t’attend dans l’inventaire.</Text>
          <Button label="Compris" onPress={streakStore.dismissChest} />
        </SystemFrame>
      </SafeAreaView>
    </Modal>
  );
}

function Reveal({ children }: { children: React.ReactNode }) {
  const progress = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + 0.4 * progress.value }],
  }));
  // Au `onLayout` et par `set` : le compilateur refuse l'affectation directe d'une valeur partagée.
  const play = () => {
    progress.set(withTiming(1, { duration: duration.drop, easing: Easing.bezier(...curve.celebrate) }));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  return <Animated.View style={style} onLayout={play}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', backgroundColor: color.background, padding: space.lg },
  content: { gap: space.md, padding: space.lg },
  label: { ...type.label, color: color.celebrate },
  heading: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
});
