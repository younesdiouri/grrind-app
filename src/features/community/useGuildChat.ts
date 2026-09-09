import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { subscribe as subscribeAuth, getState as getAuthState } from '@/features/auth/session';
import { chatApi } from '@/features/community/chatApi';
import { createChatController } from '@/features/community/chatController';
import { removeChatPhoto } from '@/features/community/chatPhoto';
import { createChatRealtime } from '@/features/community/chatRealtime';
import { connectChatStream } from '@/features/community/chatStream';
import { isGuildGone } from '@/features/community/guildRefresh';

export function useGuildChat(guildId: string, playerId: string, onGone: () => void) {
  const [connected, setConnected] = useState(false);
  // Le composant est keyed par guilde/joueur ; l'instance ne peut jamais changer de propriétaire.
  const [resources] = useState(() => {
    const abort = new AbortController();
    const transport = chatApi(guildId, abort.signal);
    const controller = createChatController({ ...transport, removePhoto: removeChatPhoto,
      now: Date.now, onGone: () => { abort.abort(); onGone(); } });
    return { abort, transport, controller };
  });
  const { controller, transport, abort } = resources;
  const state = useSyncExternalStore(controller.subscribe, controller.getState);
  useEffect(() => {
    const realtime = createChatRealtime({
      subscription: transport.subscription, connect: connectChatStream,
      catchUp: controller.catchUp,
      onError: (error) => { if (isGuildGone(error.failure)) controller.acceptError(error); },
      onStatus: setConnected,
      now: Date.now, schedule: (callback, delay) => {
        const timer = setTimeout(callback, delay);
        return () => clearTimeout(timer);
      },
    });
    const stop = () => { realtime.dispose(); abort.abort(); controller.dispose(); };
    abort.signal.addEventListener('abort', () => realtime.dispose(), { once: true });
    const unsubscribe = subscribeAuth(() => {
      const auth = getAuthState();
      if (auth.status !== 'signedIn' || auth.user.id !== playerId) stop();
    });
    realtime.setActive(AppState.currentState === 'active');
    const appState = AppState.addEventListener('change', (next) => realtime.setActive(next === 'active'));
    return () => { appState.remove(); unsubscribe(); stop(); };
  }, [abort, controller, transport, playerId]);
  return { state, controller, connected, signal: abort.signal };
}
