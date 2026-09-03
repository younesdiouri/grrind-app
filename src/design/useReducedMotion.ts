import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Une lecture native ne peut remplacer qu'un état qui n'a pas reçu d'événement depuis. */
export function isCurrentReducedMotionRead(readRevision: number, eventRevision: number): boolean {
  return readRevision === eventRevision;
}

/** Lit la préférence système, sans la dupliquer dans le profil ni dans un stockage local. */
export function useReducedMotion(): boolean | null {
  // Inconnue vaut « halos coupés » : une préférence non lue ne doit jamais produire un éclat.
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const eventRevision = useRef(0);

  useEffect(() => {
    let active = true;
    // L'abonnement précède la requête : sinon son résultat, déjà obsolète, pourrait rallumer
    // un halo juste après que le système a demandé Réduire les animations.
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      eventRevision.current += 1;
      setReducedMotion(enabled);
    });
    const readRevision = eventRevision.current;

    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (active && isCurrentReducedMotionRead(readRevision, eventRevision.current)) {
          setReducedMotion(enabled);
        }
      },
      // Un module natif indisponible reste un état sûr : `null` laisse les halos coupés et
      // consomme explicitement le rejet pour qu'il ne devienne pas une promesse non gérée.
      () => undefined,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
}
