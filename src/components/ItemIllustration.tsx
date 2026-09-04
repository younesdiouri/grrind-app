import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { components } from '@/api/schema';
import { ItemPlaceholder } from '@/components/ItemPlaceholder';
import { itemIllustrationPresentation } from '@/components/itemIllustrationState';
import { color, radius } from '@/design/tokens';

type DroppedItem = components['schemas']['DroppedItem'];

type ItemIllustrationProps = {
  item: Pick<DroppedItem, 'imageUrl' | 'kind' | 'name' | 'slot'>;
  size?: number;
  tint?: string;
  accessibilityLabel?: string;
};

/**
 * L’illustration publiée avec son filet local : le pictogramme reste présent tant que la
 * ressource distante n’a pas prouvé qu’elle peut être affichée.
 *
 * `source`, `contentFit`, `onLoad` et `onError` suivent l’API Expo Image de SDK 57 :
 * https://docs.expo.dev/versions/v57.0.0/sdk/image/
 */
export function ItemIllustration({
  item,
  size = 56,
  tint = color.textMuted,
  accessibilityLabel,
}: ItemIllustrationProps) {
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const presentation = itemIllustrationPresentation({
    imageUrl: item.imageUrl,
    loadedImageUrl,
    failedImageUrl,
  });

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      {presentation.placeholderVisible ? (
        <ItemPlaceholder kind={item.kind} slot={item.slot} size={size} tint={tint} />
      ) : null}

      {presentation.source === null ? null : (
        <Image
          accessible={presentation.imageVisible && accessibilityLabel !== undefined}
          accessibilityLabel={accessibilityLabel}
          source={presentation.source}
          contentFit="contain"
          onLoad={() => setLoadedImageUrl(presentation.source)}
          onError={() => setFailedImageUrl(presentation.source)}
          style={[StyleSheet.absoluteFill, styles.image, !presentation.imageVisible && styles.imageLoading]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    backgroundColor: color.surfaceRaised,
  },
  // La ressource doit charger sans recouvrir le pictogramme qui garantit le fallback.
  imageLoading: { opacity: 0 },
});
