import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/useAuth';
import { sportNative } from '@/features/health/sportNative';

const SportCaptureContext = createContext<{ active: boolean; failed: boolean } | undefined>(undefined);

export function useSportCaptureStatus() {
  return useContext(SportCaptureContext);
}

/** Un seul propriétaire natif pour tous les en-têtes, même quand la navigation en monte plusieurs. */
export function SportCaptureProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const owner = auth.status === 'signedIn' ? auth.user.id : null;
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!__DEV__ || !sportNative) return;
    const native = sportNative;
    let disposed = false;
    const update = async () => {
      try {
        const status = await native.sportStatus();
        if (!disposed) { setActive(status.activeCaptureId !== null); setFailed(status.storageFailed); }
      } catch { if (!disposed) setFailed(true); }
    };
    void native.setSportOwner(owner).then(update).catch(() => { if (!disposed) setFailed(true); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void update(); }, 3000);
    return () => { disposed = true; clearInterval(timer); void native.setSportOwner(null).catch(() => {}); };
  }, [owner]);
  return <SportCaptureContext.Provider value={__DEV__ ? { active, failed } : undefined}>
    {children}
  </SportCaptureContext.Provider>;
}
