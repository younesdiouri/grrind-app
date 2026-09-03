import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Lit la préférence système, sans la dupliquer dans le profil ni dans un stockage local. */
export function useReducedMotion(): boolean | null {
  // Inconnue vaut « halos coupés » : une préférence non lue ne doit jamais produire un éclat.
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (active) {
          setReducedMotion(enabled);
        }
      },
      // Un module natif indisponible reste un état sûr : `null` laisse les halos coupés et
      // consomme explicitement le rejet pour qu'il ne devienne pas une promesse non gérée.
      () => undefined,
    );

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
