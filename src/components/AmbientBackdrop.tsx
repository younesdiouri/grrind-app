import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ambientMotion, color, stroke } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';
import { shouldAnimateBackdrop } from './ambientBackdropState';

/**
 * Fond d'ambiance biométrique tactique.
 *
 * Affiche une géométrie télémétrique statique et anime deux à quatre rails discrets
 * pilotés par une horloge Reanimated unique, sans jamais déclencher de rerendu React.
 * L'animation est automatiquement coupée lorsque les animations système sont réduites
 * ou lorsque l'application passe en arrière-plan.
 *
 * @returns Le composant de fond plein écran non interactif.
 */
export function AmbientBackdrop() {
  const reducedMotion = useReducedMotion();
  const [appState, setAppState] = useState(() => AppState.currentState);
  const clock = useSharedValue(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      setAppState(status);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const active = shouldAnimateBackdrop(reducedMotion, appState);

  useEffect(() => {
    if (!active) {
      cancelAnimation(clock);
      clock.value = 0;
      return;
    }

    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, {
        duration: ambientMotion.cycleDuration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(clock);
    };
  }, [active, clock]);

  const railOneStyle = useAnimatedStyle(() => {
    const translateY = interpolate(clock.value, [0, 1], [-200, 800]);
    const opacity = interpolate(
      clock.value,
      [0, 0.3, 0.7, 1],
      [
        ambientMotion.railMinOpacity,
        ambientMotion.railMaxOpacity,
        ambientMotion.railMaxOpacity,
        ambientMotion.railMinOpacity,
      ],
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const railTwoStyle = useAnimatedStyle(() => {
    const progress = (clock.value + 0.5) % 1;
    const translateY = interpolate(progress, [0, 1], [800, -200]);
    const opacity = interpolate(
      progress,
      [0, 0.4, 0.8, 1],
      [
        ambientMotion.railMinOpacity * 0.8,
        ambientMotion.railMaxOpacity * 0.9,
        ambientMotion.railMaxOpacity * 0.9,
        ambientMotion.railMinOpacity * 0.8,
      ],
    );

    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  const scannerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(clock.value, [0, 1], [-100, 400]);
    const opacity = interpolate(
      clock.value,
      [0, 0.5, 1],
      [
        ambientMotion.railMinOpacity * 0.5,
        ambientMotion.railMaxOpacity * 0.7,
        ambientMotion.railMinOpacity * 0.5,
      ],
    );

    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.staticTelemetryGrid}>
        <View style={styles.horizontalAxis} />
        <View style={styles.verticalAxis} />
        <View style={styles.cornerMarkerTopLeft} />
        <View style={styles.cornerMarkerTopRight} />
        <View style={styles.cornerMarkerBottomLeft} />
        <View style={styles.cornerMarkerBottomRight} />
      </View>

      <Animated.View style={[styles.rail, styles.railPrimary, railOneStyle]} />
      <Animated.View style={[styles.rail, styles.railSecondary, railTwoStyle]} />
      <Animated.View style={[styles.scannerBeam, scannerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.background,
    overflow: 'hidden',
    zIndex: -1,
  },
  staticTelemetryGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  horizontalAxis: {
    position: 'absolute',
    top: 140,
    left: 20,
    right: 20,
    height: stroke.hairline,
    backgroundColor: 'rgba(53, 228, 255, 0.08)',
  },
  verticalAxis: {
    position: 'absolute',
    top: 60,
    bottom: 60,
    left: 36,
    width: stroke.hairline,
    backgroundColor: 'rgba(53, 228, 255, 0.05)',
  },
  cornerMarkerTopLeft: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 14,
    height: 14,
    borderTopWidth: stroke.thin,
    borderLeftWidth: stroke.thin,
    borderColor: 'rgba(53, 228, 255, 0.2)',
  },
  cornerMarkerTopRight: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 14,
    height: 14,
    borderTopWidth: stroke.thin,
    borderRightWidth: stroke.thin,
    borderColor: 'rgba(53, 228, 255, 0.2)',
  },
  cornerMarkerBottomLeft: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    width: 14,
    height: 14,
    borderBottomWidth: stroke.thin,
    borderLeftWidth: stroke.thin,
    borderColor: 'rgba(53, 228, 255, 0.2)',
  },
  cornerMarkerBottomRight: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 14,
    height: 14,
    borderBottomWidth: stroke.thin,
    borderRightWidth: stroke.thin,
    borderColor: 'rgba(53, 228, 255, 0.2)',
  },
  rail: {
    position: 'absolute',
    width: stroke.medium,
    height: 160,
    borderRadius: 1,
  },
  railPrimary: {
    left: '28%',
    backgroundColor: color.accent,
  },
  railSecondary: {
    right: '24%',
    backgroundColor: 'rgba(53, 228, 255, 0.6)',
  },
  scannerBeam: {
    position: 'absolute',
    top: 260,
    width: 80,
    height: stroke.thin,
    backgroundColor: color.accent,
  },
});
