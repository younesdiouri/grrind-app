import type { SharedValue } from 'react-native-reanimated';
import type { BattleTimeline } from './timeline';
import type { UnityAvatar, UnityInspectorProps, UnityViewport } from './unityFrame';

export const unityCombatAvailable = false;
export type UnityCombatProps = {
  clock: SharedValue<number>; timeline: BattleTimeline; player: UnityAvatar; enemy: UnityAvatar;
  viewport: UnityViewport; width: number; playing: boolean; done: boolean;
  hud: { playerName: string; enemyName: string; playerHp: number; enemyHp: number;
    won: boolean; limit: boolean; hideHud: boolean; coins: number; loot: number };
  onReady(): void; onError(): void;
};
export function UnityCombatStage(_props: UnityCombatProps) { return null; }
export function UnityAvatarInspector(_props: UnityInspectorProps) { return null; }
