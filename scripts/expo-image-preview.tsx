import { type CSSProperties } from 'react';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

type PreviewImageProps = {
  source?: string | { uri?: string } | null;
  contentFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

/**
 * Expo Image n’expose que ses sources TypeScript à Node. Metro sait les choisir par plateforme,
 * mais le générateur statique ne le sait pas : cet adaptateur reproduit uniquement les deux
 * props qui changent le HTML de nos previews, sans créer une seconde version du composant.
 */
export function Image({ source, contentFit = 'cover', style, accessibilityLabel }: PreviewImageProps) {
  const uri = typeof source === 'string' ? source : source?.uri;

  return (
    <img
      alt={accessibilityLabel ?? ''}
      src={uri}
      style={{
        ...(StyleSheet.flatten(style) as CSSProperties),
        objectFit: contentFit,
        objectPosition: 'center',
      }}
    />
  );
}
