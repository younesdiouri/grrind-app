import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useReducedMotion } from '@/design/useReducedMotion';
import { cameraAt, type Impact } from './camera';
import { ImpactLayer } from './ImpactLayer';
import type { Actor, Ramp } from './timeline';

/** Duel et raid partagent la caméra, les contacts et la lumière ; chacun place ses acteurs. */
export function Stage({ clock, impacts, points, combos, effects = true, style, children }: {
  clock: SharedValue<number>; impacts: Impact[];
  points: Record<Actor, { x: number; y: number }>;
  combos?: Record<Actor, Ramp>; effects?: boolean;
  style?: StyleProp<ViewStyle>; children: ReactNode;
}) {
  const reduced = useReducedMotion() !== false;
  const camera = useAnimatedStyle(() => {
    const state = cameraAt(effects ? impacts : [], clock.get(), reduced);
    return { transform: [{ translateX: state.x }, { translateY: state.y }, { scale: state.scale }] };
  });
  return <Animated.View style={[style, camera]}>
    {children}
    {effects && <ImpactLayer clock={clock} impacts={impacts} points={points} combos={combos} />}
  </Animated.View>;
}
