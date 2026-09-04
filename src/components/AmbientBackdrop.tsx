import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { shouldAnimateBackdrop } from '@/design/ambientBackdrop';
import { ambient, color } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';

type Rail = (typeof ambient.rails)[number];

const BackdropClockContext = createContext<SharedValue<number> | null>(null);

/** L'unique horloge du décor connecté; les scènes ne font qu'en lire la progression. */
export function AmbientBackdropProvider({ children }: PropsWithChildren) {
  const reducedMotion = useReducedMotion();
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const clock = useSharedValue(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppIsActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    cancelAnimation(clock);
    clock.value = 0;

    if (!shouldAnimateBackdrop(reducedMotion, appIsActive)) {
      return;
    }

    // `withRepeat` tourne sur le thread UI et s'arrête explicitement au changement d'état.
    // Source : https://docs.swmansion.com/react-native-reanimated/docs/animations/withRepeat/
    clock.value = withRepeat(
      withTiming(1, { duration: ambient.cycle, easing: Easing.linear }),
      -1,
      false,
      undefined,
      ReduceMotion.Never,
    );

    return () => cancelAnimation(clock);
  }, [appIsActive, clock, reducedMotion]);

  return <BackdropClockContext.Provider value={clock}>{children}</BackdropClockContext.Provider>;
}

/**
 * L'horloge partagée, pour tout ce qui bouge en continu (#159).
 *
 * Elle était privée tant que le décor était son seul lecteur. Elle ne l'est plus : `seam`,
 * `tick`, `orbit`, `sweep`, `flow`, `beacon`, `convey` et `caret` s'y branchent tous par une
 * phase et un modulo (`motionPhase.ts`) plutôt que d'ouvrir chacun son `withRepeat`. Le coût de
 * dix animations devient celui d'une seule, et elles restent en phase entre elles pour toujours
 * — ce que dix horloges indépendantes ne garantissent pas, puisqu'elles ne démarrent pas au
 * même frame.
 *
 * Elle vaut 0 et ne bouge plus sous « Réduire les animations » ou hors du premier plan : c'est
 * `decorativeMotion` qui décide de *jouer* ou non, pas l'horloge, et un lecteur qui ignorerait
 * la préférence resterait simplement figé au lieu de scintiller.
 */
export function useBackdropClock(): SharedValue<number> {
  const clock = useContext(BackdropClockContext);

  if (clock === null) {
    throw new Error('useBackdropClock doit être appelé sous AmbientBackdropProvider');
  }

  return clock;
}

/** Les traits d'une scène, posés sous son contenu et pilotés par l'horloge partagée. */
export function AmbientBackdrop() {
  const clock = useBackdropClock();

  return (
    <>
      {ambient.rails.map((rail) => (
        <MovingRail key={`${rail.top}-${rail.left}`} rail={rail} clock={clock} />
      ))}
    </>
  );
}

function MovingRail({ rail, clock }: { rail: Rail; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const phase = (clock.value + rail.phase) % 1;
    return {
      opacity: interpolate(
        phase,
        [0, 0.12, 0.82, 1],
        [0, ambient.railOpacity, ambient.railOpacity, 0],
        Extrapolation.CLAMP,
      ),
      transform: [{ translateY: rail.distance * phase }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.rail, { left: rail.left, top: rail.top }, style]}
    />
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    zIndex: ambient.layer,
    width: ambient.railWidth,
    height: ambient.railHeight,
    backgroundColor: color.accent,
  },
});
