import { requireOptionalNativeModule } from 'expo';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { color, leagueArt, type } from '@/design/tokens';
import { AvatarSnow } from './AvatarSnow';
import type { AvatarPreviewProps } from './AvatarPreview';
import { capturePreview } from './capturePreview';
import { previewConfiguration } from './previewConfiguration';

const bridge = requireOptionalNativeModule<{ captureAvatar(configuration: string): Promise<string> }>('GrrindUnity');
let queue: Promise<unknown> = Promise.resolve();
const captures = new Map<string, string>();

export function AvatarPreview({ avatar, label, framing = 'full', fallbackName }: AvatarPreviewProps) {
  const focused = useIsFocused();
  const [image, setImage] = useState<{ key: string; uri: string }>();
  const [loaded, setLoaded] = useState<string>();
  const [failure, setFailure] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const configuration = JSON.stringify(previewConfiguration(avatar, size, framing));
  useEffect(() => {
    if (!focused || size.width <= 0 || size.height <= 0 || image?.key === configuration || failure === configuration) return;
    let active = true;
    // There is one Unity runtime. Stale requests never replace the current appearance.
    queue = queue.catch(() => undefined).then(async () => {
      if (!active) return;
      try {
        if (!bridge?.captureAvatar) throw new Error('Avatar preview unavailable');
        const uri = captures.get(configuration) ?? await capturePreview(configuration, value => bridge.captureAvatar(value), () => active);
        if (active && uri) {
          captures.set(configuration, uri);
          if (captures.size > 6) captures.delete(captures.keys().next().value!);
          setImage({ key: configuration, uri });
        }
      } catch (error) {
        if (active) {
          if (__DEV__) console.warn('GRRIND avatar preview:', error);
          setFailure(configuration);
        }
      }
    });
    return () => { active = false; };
  }, [configuration, focused, retry, image?.key, failure, size.width, size.height]);
  const current = image?.key === configuration && failure !== configuration;
  const identityFallback = framing === 'portrait' ? <View accessible accessibilityRole="image"
    accessibilityLabel={`${label} · aperçu indisponible`}><PlayerAvatar name={fallbackName ?? ''} /></View> : null;
  return <View style={styles.preview} onLayout={event => setSize(event.nativeEvent.layout)}
    testID={current && loaded === configuration ? 'combat-avatar-ready' : 'combat-avatar-loading'}>
    {current ? <>
      <Image source={{ uri: image.uri }} recyclingKey={configuration} style={framing === 'portrait' ? styles.headImage : StyleSheet.absoluteFill}
        contentFit="contain" accessible accessibilityLabel={label} onLoad={() => setLoaded(configuration)}
        onError={() => { captures.delete(configuration); setFailure(configuration); setImage(undefined); }} />
      {focused && framing === 'full' && <AvatarSnow />}
    </> : failure === configuration ? <>
      {identityFallback ?? <><Text style={styles.note}>Aperçu indisponible.</Text>
        <Button label="Recharger l’aperçu" variant="quiet" onPress={() => { setFailure(undefined); setRetry(value => value + 1); }} /></>}
    </> : identityFallback ?? <ActivityIndicator color={color.accent} accessibilityLabel="Chargement du personnage" />}
  </View>;
}
const styles = StyleSheet.create({
  headImage: { position: 'absolute', width: leagueArt.headImageSize, height: leagueArt.headImageSize,
    top: leagueArt.headImageTop, left: leagueArt.headImageLeft },
  preview: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: color.background },
  note: { ...type.label, color: color.textMuted },
});
