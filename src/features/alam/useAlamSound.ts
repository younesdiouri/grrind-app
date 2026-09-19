import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Le son accompagne l'écran visible ; aucune session audio ne survit au raid ou à la veille. */
export function useAlamSound(active: boolean) {
  const [enabled, setEnabled] = useState(true);
  const ambience = useAudioPlayer(require('../../../assets/audio/alam/ambience.wav'));
  const impact = useAudioPlayer(require('../../../assets/audio/alam/impact.wav'));
  const drop = useAudioPlayer(require('../../../assets/audio/alam/drop.wav'));
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/immutability -- Setter natif documenté par expo-audio, pas une mutation de l'état React.
    ambience.loop = true;
    if (enabled && active) ambience.play();
    else { ambience.pause(); impact.pause(); drop.pause(); }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && enabled && active) ambience.play();
      else { ambience.pause(); impact.pause(); drop.pause(); }
    });
    return () => { subscription.remove(); ambience.pause(); };
  }, [active, enabled, ambience, impact, drop]);
  return {
    enabled, toggle: () => setEnabled((value) => !value),
    cue: (isDrop: boolean) => {
      if (!enabled || !active || AppState.currentState !== 'active') return;
      const player = isDrop ? drop : impact;
      void player.seekTo(0).then(() => player.play()).catch(() => undefined);
    },
  };
}
