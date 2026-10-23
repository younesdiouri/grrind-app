import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { components } from '@/api/schema';
import { color, space, type } from '@/design/tokens';
import { equippedAvatarPreview } from './equippedAvatarPreview.ts';
import { EQUIPPED_AVATAR_IMAGES } from './equippedAvatarImages.ts';

/** Les captures reprennent l’équipement serveur ; Unity reste réservé aux écrans plein cadre. */
export function CombatAvatarPreview({ equipment }: { equipment: components['schemas']['PublicInventory']['equipment'] }) {
  const { key, unsupported } = equippedAvatarPreview(equipment);
  const [loaded, setLoaded] = useState<string>();
  const names = Object.values(equipment).flatMap((line) => line ? [line.name] : []);
  return <View style={styles.container} testID={`avatar-preview-${key}`}>
    <Image source={EQUIPPED_AVATAR_IMAGES[key]} style={styles.preview} recyclingKey={key}
      contentFit="contain" accessible accessibilityLabel={`Personnage équipé : ${names.join(', ') || 'tenue de base'}`}
      onLoad={() => setLoaded(key)} testID={loaded === key ? 'combat-avatar-ready' : 'combat-avatar-loading'} />
    {unsupported.length > 0 && <Text style={styles.note}>
      Équipé, sans aperçu 3D : {unsupported.map((line) => line.name).join(', ')}
    </Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', gap: space.xs },
  preview: { width: '100%', flex: 1 },
  note: { ...type.label, color: color.textMuted, textAlign: 'center' },
});
