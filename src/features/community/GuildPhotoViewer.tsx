import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';

export function GuildPhotoViewer({ uri, signal, onClose }: {
  uri: string; signal: AbortSignal; onClose: () => void;
}) {
  const [display, setDisplay] = useState<'loading' | 'ready' | 'error'>('loading');
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (signal.aborted) { onClose(); return; }
    signal.addEventListener('abort', onClose);
    return () => signal.removeEventListener('abort', onClose);
  }, [signal, onClose]);

  if (signal.aborted) return null;
  return <Modal visible presentationStyle="fullScreen" onRequestClose={onClose}>
    <View style={[styles.viewer, { paddingTop: insets.top + space.md, paddingBottom: Math.max(insets.bottom, space.md) }]}
      accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <Button label="Fermer la photo" variant="quiet" onPress={onClose} />
      <View style={styles.stage}>
        {display !== 'error' && <Image source={{ uri }} cachePolicy="none" contentFit="contain"
          style={StyleSheet.absoluteFill} accessibilityLabel="Photo partagée dans la guilde, en grand"
          onLoad={() => setDisplay('ready')} onError={() => setDisplay('error')} />}
        {display === 'loading' && <ActivityIndicator color={color.accent} accessibilityLabel="Chargement de la photo en grand" />}
        {display === 'error' && <Text accessibilityRole="alert" style={styles.error}>Impossible d’afficher cette photo. Ferme-la puis réessaie.</Text>}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: color.background, paddingHorizontal: space.md, gap: space.md },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { ...type.body, color: color.danger, textAlign: 'center', padding: space.lg },
});
