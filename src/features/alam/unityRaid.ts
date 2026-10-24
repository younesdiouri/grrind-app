import type { components } from '@/api/schema';
import type { SharedValue } from 'react-native-reanimated';

type AlamEvent = components['schemas']['AlamEvent'];
export type RaidMember = { id: string; name: string };
export type UnityRaidProps = { clock: SharedValue<number>; events: AlamEvent[]; members: RaidMember[];
  finalEncounter: number; onReady(): void; onError(): void };
export type RaidFrame = ReturnType<typeof raidFrameAt>;
const STRIKE_MS = 900;

/** Presentation only: server efforts select their actor; no HP, damage or rewards are inferred. */
export function raidFrameAt(events: AlamEvent[], ids: string[], time: number, finalEncounter: number, reduced: boolean) {
  'worklet';
  const current = events.findLast((event) => event.offsetMs <= time);
  const encounter = current?.encounterIndex ?? events[0]?.encounterIndex ?? 1;
  const arrival = events.findLast((event) => event.encounterIndex === encounter && event.action === 'ARRIVAL' && event.offsetMs <= time);
  const outcome = events.findLast((event) => event.encounterIndex === encounter
    && (event.action === 'VICTORY' || event.action === 'DEFEAT') && event.offsetMs <= time);
  let hit = 0;
  const heroes = ids.map((id) => {
    const effort = events.findLast((event) => event.encounterIndex === encounter && event.action === 'EFFORT'
      && event.actorId === id && event.offsetMs <= time);
    const active = !outcome && effort !== undefined && time - effort.offsetMs < STRIKE_MS;
    const phase = active ? (time - effort.offsetMs) / STRIKE_MS : (Math.max(0, time) % 2500) / 2500;
    if (active && !reduced) hit = Math.max(hit, Math.max(0, 1 - Math.abs(phase - .5) / .16));
    return { pose: active ? 1 : 0, phase: reduced && active ? .5 : phase };
  });
  return { time: Math.max(0, time), encounter, boss: encounter === finalEncounter,
    arrival: arrival ? Math.min(1, Math.max(0, time - arrival.offsetMs) / 850) : 1,
    heroes, hit, verdict: outcome?.action === 'VICTORY' ? 1 : outcome?.action === 'DEFEAT' ? -1 : 0,
    verdictPhase: outcome ? Math.min(1, Math.max(0, time - outcome.offsetMs) / 1200) : 0, reduced };
}
