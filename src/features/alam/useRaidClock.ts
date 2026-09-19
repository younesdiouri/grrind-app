import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { cancelAnimation, Easing, ReduceMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { AlamRun } from './api';
import { eventIndexAt, opensAsReplay, presentationOffset } from './clock';

/** L'animation ne passe jamais par React : seul le curseur du journal change aux événements serveur. */
export function useRaidClock(run: AlamRun, receivedAt: number, replay: boolean) {
  const clock = useSharedValue(0);
  const duration = run.presentationStartsAt && run.presentationEndsAt
    ? Date.parse(run.presentationEndsAt) - Date.parse(run.presentationStartsAt) : 0;
  // Le replay ne se demande pas seulement : une fenêtre en direct déjà passée le décide.
  const [replayAt, setReplayAt] = useState<number | null>(() => replay
    || opensAsReplay(run.presentationStartsAt ?? run.serverNow, run.serverNow, receivedAt, Date.now(), duration)
    ? Date.now() : null);
  const [cursor, setCursor] = useState(-1);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const offset = () => replayAt === null
      ? presentationOffset(run.presentationStartsAt ?? run.serverNow, run.serverNow, receivedAt, Date.now(), duration)
      : Math.min(duration, Math.max(0, Date.now() - replayAt));
    const align = () => {
      clearTimeout(timer);
      const now = offset();
      clock.set(now);
      clock.set(withTiming(duration, { duration: Math.max(0, duration - now), easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
      setCursor(eventIndexAt(run.events, now)); setFinished(now >= duration);
      const next = () => {
        const elapsed = offset();
        const index = eventIndexAt(run.events, elapsed);
        setCursor(index); setFinished(elapsed >= duration);
        const nextEvent = run.events[index + 1];
        const boundary = nextEvent?.offsetMs ?? duration;
        if (elapsed >= duration) return;
        timer = setTimeout(() => {
          next();
        }, Math.max(1, boundary - elapsed));
      };
      next();
    };
    align();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') align(); else { clearTimeout(timer); cancelAnimation(clock); }
    });
    return () => { clearTimeout(timer); cancelAnimation(clock); subscription.remove(); };
  }, [clock, duration, receivedAt, replayAt, run.events, run.presentationStartsAt, run.serverNow]);
  return { clock, cursor, finished, replaying: replayAt !== null, restart: () => setReplayAt(Date.now()),
    skip: () => setReplayAt(Date.now() - duration) };
}
