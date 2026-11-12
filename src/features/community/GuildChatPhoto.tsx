import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { color, guildChat } from '@/design/tokens';
import { readChatImage } from '@/features/community/chatImage';
import type { ChatError, ChatMessage } from '@/features/community/chatState';
import { GuildPhotoViewer } from '@/features/community/GuildPhotoViewer';

export function GuildChatPhoto({ guildId, message, signal, onError }: {
  guildId: string; message: ChatMessage; signal: AbortSignal; onError: (error: ChatError) => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    let mounted = true;
    const forget = () => { setOpen(false); setUri(null); };
    signal.addEventListener('abort', forget);
    if (!signal.aborted) void readChatImage(guildId, message.id, signal).then((result) => {
      if (!mounted || signal.aborted) return;
      if (result.ok) setUri(result.data);
      else { setFailed(true); onError(result.error); }
    });
    return () => { mounted = false; signal.removeEventListener('abort', forget); };
  }, [guildId, message.id, signal, attempt, onError]);

  if (signal.aborted) return null;
  if (failed) return <Button label="Recharger la photo" variant="quiet" onPress={() => { setUri(null); setFailed(false); setAttempt(attempt + 1); }} />;
  if (!uri) return <View style={styles.photo}><ActivityIndicator color={color.accent} accessibilityLabel="Chargement de la photo" /></View>;

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir la photo en grand"
      onPress={() => { if (!signal.aborted) setOpen(true); }}>
      <Image source={{ uri }} cachePolicy="none" contentFit="contain" style={styles.photo}
        accessible={false} onError={() => setFailed(true)} />
    </Pressable>
    {open && <GuildPhotoViewer uri={uri} signal={signal} onClose={close} />}
  </>;
}

const styles = StyleSheet.create({
  photo: { width: guildChat.photoHeight, height: guildChat.photoHeight, maxWidth: '100%', alignItems: 'center', justifyContent: 'center' },
});
