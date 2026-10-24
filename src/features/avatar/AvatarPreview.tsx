import { StyleSheet, Text, View } from 'react-native';
import { color, type } from '@/design/tokens';
import type { UnityAvatar } from '@/features/combat/unityFrame';

export type AvatarPreviewProps = { avatar: UnityAvatar; label: string };

export function AvatarPreview({ label }: AvatarPreviewProps) {
  return <View style={styles.preview} accessibilityRole="image" accessibilityLabel={label}>
    <Text style={styles.note}>Aperçu disponible dans l’app iOS.</Text>
  </View>;
}
const styles = StyleSheet.create({
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { ...type.label, color: color.textMuted },
});
