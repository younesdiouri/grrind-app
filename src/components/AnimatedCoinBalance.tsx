import { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { CoinIcon } from '@/components/CoinIcon';
import { color, curve, duration, space, type } from '@/design/tokens';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type AnimatedCoinBalanceProps = { before: number; after: number };

/** Joue les soldes déjà tranchés par le serveur ; l'interpolation ne crée aucun gain. */
export function AnimatedCoinBalance({ before, after }: AnimatedCoinBalanceProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: duration.settle,
      easing: Easing.bezier(...curve.enter),
    });
  }, [after, before, progress]);

  const animatedProps = useAnimatedProps(() => {
    const value = Math.round(before + (after - before) * progress.value);
    const text = `${value}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  const unit = Math.abs(after) === 1 ? 'pièce' : 'pièces';

  return (
    <View style={styles.amount} accessible accessibilityLabel={`${after} ${unit}`}>
      <CoinIcon />
      <AnimatedTextInput
        style={styles.value}
        editable={false}
        animatedProps={animatedProps}
        defaultValue={`${before}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  value: { ...type.body, color: color.coin },
});
