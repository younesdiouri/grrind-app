import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Le son accompagne l'écran visible ; aucune session audio ne survit au raid ou à la veille. */
export function useAlamSound(active: boolean) {
  const [enabled, setEnabled] = useState(true);
  const impact = useAudioPlayer(require('../../../assets/audio/alam/impact.wav'));
  const drop = useAudioPlayer(require('../../../assets/audio/alam/drop.wav'));
  useEffect(() => {
    // `playsInSilentMode` : sans lui, l'interrupteur de sonnerie d'un iPhone coupe tout, et
    // la scène est muette sur l'appareil alors qu'elle sonne au Simulator — qui l'ignore.
    // Le raid est un écran qu'on ouvre exprès et qui porte son propre bouton de coupure ;
    // `shouldPlayInBackground: false` garde le son enfermé dans l'écran visible.
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    if (!enabled || !active) { impact.pause(); drop.pause(); }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') { impact.pause(); drop.pause(); }
    });
    // Aucun `pause()` au démontage : `useAudioPlayer` libère ses lecteurs dans un effet déclaré
    // avant celui-ci, donc l'objet natif a déjà disparu quand ce nettoyage passe — et c'est la
    // libération elle-même qui coupe le son.
    return () => { subscription.remove(); };
  }, [active, enabled, impact, drop]);
  return {
    enabled, toggle: () => setEnabled((value) => !value),
    cue: (isDrop: boolean) => {
      if (!enabled || !active || AppState.currentState !== 'active') return;
      const player = isDrop ? drop : impact;
      void player.seekTo(0).then(() => player.play()).catch(() => undefined);
    },
  };
}
