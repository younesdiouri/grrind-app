import { requireNativeView, requireOptionalNativeModule } from 'expo';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import { cancelAnimation, Easing, useAnimatedReaction, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReducedMotion } from '@/design/useReducedMotion';
import { UNITY_POSES, unityActorFrame, type UnityAvatar, type UnityInspectorProps, type UnityViewport } from './unityFrame';
import type { BattleTimeline } from './timeline';
import { unityPresentationAt } from './unityPresentation';

export type UnityHud = { playerName: string; enemyName: string; playerHp: number; enemyHp: number;
  won: boolean; limit: boolean; hideHud: boolean; coins: number; loot: number };

type UnityModule = { isAvailable(): boolean; setFrame(frame: string): Promise<void> };
const bridge = requireOptionalNativeModule<UnityModule>('GrrindUnity');
export const unityCombatAvailable = bridge?.isAvailable() === true;
type NativeProps = ViewProps & { configuration: string; onReady(): void; onFailure(): void };
const UnityView = bridge ? requireNativeView<NativeProps>('GrrindUnity') : null;

export type UnityCombatProps = {
  clock: SharedValue<number>; timeline: BattleTimeline; player: UnityAvatar; enemy: UnityAvatar;
  viewport: UnityViewport; width: number; playing: boolean; done: boolean;
  hud: UnityHud;
  onReady(): void; onError(): void;
};

/** One fullscreen Unity runtime underneath the existing RN HUD, never one instance per fighter. */
export function UnityCombatStage({ clock, timeline, player, enemy, viewport, width, playing, done, hud, onReady, onError }: UnityCombatProps) {
  const focused = useIsFocused();
  const [ready, setReady] = useState(false);
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  const reduced = useReducedMotion() !== false;
  const configuration = JSON.stringify({ player, enemy, viewport, hud });
  const send = useCallback((frame: string) => {
    void bridge?.setFrame(frame).catch(() => onErrorRef.current());
  }, []);
  useEffect(() => {
    if (ready || !focused) return;
    const timeout = setTimeout(() => onErrorRef.current(), 15_000);
    return () => clearTimeout(timeout);
  }, [ready, focused]);
  useAnimatedReaction(
    () => ({ bucket: ready && focused ? Math.floor(clock.get() / 33) : -1,
      playerVisible: playing && player.visible, enemyVisible: enemy.visible, done, reduced, width }),
    (state, previous) => {
      if (state.bucket < 0 || (state.bucket === previous?.bucket && state.playerVisible === previous.playerVisible
        && state.enemyVisible === previous.enemyVisible && state.done === previous.done
        && state.reduced === previous.reduced && state.width === previous.width)) return;
      const time = clock.get();
      scheduleOnRN(send, JSON.stringify({
        presentation: unityPresentationAt(timeline, time, done, reduced),
        player: unityActorFrame(timeline.beats, 'PLAYER', time, {
          critical: timeline.enemy.criticalFlash, dodge: timeline.player.dodgeFlash,
          combo: timeline.player.comboFlash, replay: timeline.player.replayFlash,
        }, width, state.playerVisible, reduced),
        enemy: unityActorFrame(timeline.beats, 'ENEMY', time, {
          critical: timeline.player.criticalFlash, dodge: timeline.enemy.dodgeFlash,
          combo: timeline.enemy.comboFlash, replay: timeline.enemy.replayFlash,
        }, width, state.enemyVisible, reduced),
      }));
    },
  );
  return UnityView && focused ? <UnityView style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}
    configuration={configuration} testID={ready ? 'unity-renderer-ready' : 'unity-renderer-loading'}
    onReady={() => { setReady(true); onReady(); }} onFailure={onError} /> : null;
}

export function UnityAvatarInspector({ avatar, pose, phase, animated, view, azimuth, viewport, onReady, onError }: UnityInspectorProps) {
  const focused = useIsFocused();
  const [ready, setReady] = useState(false);
  const clock = useSharedValue(phase);
  const error = useRef(onError);
  useEffect(() => { error.current = onError; }, [onError]);
  const reduced = useReducedMotion() !== false;
  const configuration = JSON.stringify({ player: avatar, enemy: { ...avatar, visible: false }, viewport,
    inspection: true, view, azimuth });
  const send = useCallback((value: number, selected: number) => {
    void bridge?.setFrame(JSON.stringify({ player: { pose: selected, phase: value, x: 0, visible: true },
      enemy: { pose: 0, phase: 0, x: 0, visible: false } })).catch(() => error.current());
  }, []);
  useEffect(() => {
    clock.set(animated && focused && !reduced ? 0 : phase);
    if (animated && focused && !reduced) clock.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1));
    return () => cancelAnimation(clock);
  }, [animated, focused, reduced, phase, pose, clock]);
  useEffect(() => {
    if (ready && focused) send(phase, UNITY_POSES[pose]);
  }, [ready, focused, configuration, phase, pose, send]);
  useEffect(() => {
    if (ready || !focused) return;
    const timeout = setTimeout(() => error.current(), 15_000);
    return () => clearTimeout(timeout);
  }, [ready, focused]);
  useAnimatedReaction(() => ready && focused ? Math.floor(clock.get() * 60) : -1, (value, previous) => {
    if (value >= 0 && value !== previous) scheduleOnRN(send, clock.get(), UNITY_POSES[pose]);
  });
  return UnityView && focused ? <UnityView style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}
    configuration={configuration} testID={ready ? 'unity-inspector-ready' : 'unity-inspector-loading'}
    onReady={() => { setReady(true); onReady(); }} onFailure={onError} /> : null;
}
