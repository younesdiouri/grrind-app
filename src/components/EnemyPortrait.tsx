import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { components } from '@/api/schema';
import { itemIllustrationPresentation } from '@/components/itemIllustrationState';
import { characterSheet, color, space, type } from '@/design/tokens';

/** Le portrait reste identifiable même sans illustration publiée ou sans réseau. */
export function EnemyPortrait({ enemy }: { enemy: components['schemas']['Enemy'] }) {
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const presentation = itemIllustrationPresentation({ imageUrl: enemy.imageUrls?.idle ?? '', loadedImageUrl, failedImageUrl });
  return (
    <View style={styles.portrait} accessible accessibilityLabel={`Illustration de ${enemy.name}`}>
      {presentation.placeholderVisible ? (
        <View style={styles.placeholder}>
          <Svg width={characterSheet.iconSize} height={characterSheet.iconSize} viewBox="0 0 24 24">
            <Path d="M5 7 3 2l7 4h4l7-4-2 5v8l-7 7-7-7zM8 11h1m6 0h1m-7 5h6" fill="none" stroke={color.textMuted} strokeWidth={characterSheet.iconStroke} strokeLinejoin="round" />
          </Svg>
          <Text style={styles.label}>Adversaire</Text>
        </View>
      ) : null}
      {presentation.source === null ? null : (
        <Image source={presentation.source} contentFit="contain"
          onLoad={() => setLoadedImageUrl(presentation.source)} onError={() => setFailedImageUrl(presentation.source)}
          style={[StyleSheet.absoluteFill, !presentation.imageVisible && styles.loading]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  portrait: { height: characterSheet.enemyPortraitHeight, backgroundColor: color.surfaceRaised },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  label: { ...type.label, color: color.textMuted },
  loading: { opacity: 0 },
});
