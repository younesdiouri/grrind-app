import { requireOptionalNativeModule } from 'expo';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { color, type } from '@/design/tokens';
import { AvatarSnow } from './AvatarSnow';
import type { AvatarPreviewProps } from './AvatarPreview';
import { capturePreview } from './capturePreview';

const bridge = requireOptionalNativeModule<{ captureAvatar(configuration: string): Promise<string> }>('GrrindUnity');
let queue: Promise<unknown> = Promise.resolve();

export function AvatarPreview({ avatar, label }: AvatarPreviewProps) {
  const focused = useIsFocused();
  const [image, setImage] = useState<{ key: string; uri: string }>();
  const [loaded, setLoaded] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const configuration = JSON.stringify({ player: avatar, enemy: { ...avatar, visible: false },
    inspection: true, view: 0, azimuth: 25, previewWidth: Math.round(size.width * 2), previewHeight: Math.round(size.height * 2) });
  useEffect(() => {
    if (!focused || size.width <= 0 || size.height <= 0 || image?.key === configuration) return;
    let active = true;
    // There is one Unity runtime. Stale requests never replace the current appearance.
    queue = queue.catch(() => undefined).then(async () => {
      if (!active) return;
      try {
        if (!bridge?.captureAvatar) throw new Error('Avatar preview unavailable');
        const uri = await capturePreview(configuration, value => bridge.captureAvatar(value), () => active);
        if (active && uri) setImage({ key: configuration, uri });
      } catch (error) {
        if (active) {
          if (__DEV__) console.warn('GRRIND avatar preview:', error);
          setFailure(configuration);
        }
      }
    });
    return () => { active = false; };
  }, [configuration, focused, retry, image?.key, size.width, size.height]);
  const current = image?.key === configuration;
  return <View style={styles.preview} onLayout={event => setSize(event.nativeEvent.layout)}
    testID={current && loaded === configuration ? 'combat-avatar-ready' : 'combat-avatar-loading'}>
    {current ? <>
      <Image source={{ uri: image.uri }} recyclingKey={configuration} style={StyleSheet.absoluteFill}
        contentFit="contain" accessible accessibilityLabel={label} onLoad={() => setLoaded(configuration)} />
      {focused && <AvatarSnow />}
    </> : failure === configuration ? <>
      <Text style={styles.note}>Aperçu indisponible.</Text>
      <Button label="Recharger l’aperçu" variant="quiet" onPress={() => { setFailure(undefined); setRetry(value => value + 1); }} />
    </> : <ActivityIndicator color={color.accent} accessibilityLabel="Chargement du personnage" />}
  </View>;
}
const styles = StyleSheet.create({
  preview: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: color.background },
  note: { ...type.label, color: color.textMuted },
});
