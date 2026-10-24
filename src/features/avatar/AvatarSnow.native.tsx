import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useBackdropClock } from '@/components/AmbientBackdrop';
import { avatarScene } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';

export function AvatarSnow() {
  const reduced = useReducedMotion();
  const [height, setHeight] = useState(0);
  return <View pointerEvents="none" accessibilityElementsHidden style={StyleSheet.absoluteFill}
    onLayout={event => setHeight(event.nativeEvent.layout.height)}>
    {reduced === false && avatarScene.flakes.map((left, index) => <Flake key={left} left={left} index={index} height={height} />)}
  </View>;
}
function Flake({ left, index, height }: { left: number; index: number; height: number }) {
  const clock = useBackdropClock();
  const animation = useAnimatedStyle(() => {
    const phase = (clock.get() + index / avatarScene.flakes.length) % 1;
    return { opacity: Math.sin(phase * Math.PI) * avatarScene.snowOpacity,
      transform: [{ translateY: phase * height }, { translateX: Math.sin(phase * Math.PI * 2) * avatarScene.drift }, { rotate: '45deg' }] };
  });
  return <Animated.View style={[styles.flake, { left: `${left}%` }, animation]} />;
}
const styles = StyleSheet.create({
  flake: { position: 'absolute', top: 0, width: avatarScene.snowSize, height: avatarScene.snowSize, backgroundColor: avatarScene.snowColor },
});
