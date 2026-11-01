import { useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LeagueBackdrop } from '@/components/LeagueBackdrop';
import { useReducedMotion } from '@/design/useReducedMotion';
import { leagueArt } from '@/design/tokens';
import type { LeagueTier } from './league';

export function LeagueMotion({ tier }: { tier: LeagueTier }) {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const phase = useSharedValue(0);
  const period = leagueArt.presets[tier].period;
  const enabled = focused && foreground && reduced === false && period > 0;
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    phase.value = 0;
    if (enabled) {
      const reflect = withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) });
      phase.value = tier === 'GOLD'
        ? withRepeat(withSequence(withDelay(period, reflect), withTiming(0, { duration: period })), -1)
        : withRepeat(reflect, -1, true);
    }
    return () => cancelAnimation(phase);
  }, [enabled, period, phase, tier]);
  const style = useAnimatedStyle(() => ({ opacity: phase.value * leagueArt.lightOpacity,
    transform: [{ translateY: tier === 'DIAMOND' ? -phase.value * leagueArt.floatDistance : 0 }] }));
  if (!enabled) return null;
  return <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, style]}><LeagueBackdrop tier={tier} highlights /></Animated.View>;
}
