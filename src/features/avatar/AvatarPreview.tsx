import { StyleSheet, Text, View } from 'react-native';
import { color, type } from '@/design/tokens';
import type { UnityAvatar } from '@/features/combat/unityFrame';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import type { PreviewFraming } from './previewConfiguration';

export type AvatarPreviewProps = { avatar: UnityAvatar; label: string; framing?: PreviewFraming; fallbackName?: string; enabled?: boolean };

export function AvatarPreview({ label, framing, fallbackName }: AvatarPreviewProps) {
  return <View style={styles.preview} accessibilityRole="image" accessibilityLabel={label}>
    {framing === 'portrait' ? <PlayerAvatar name={fallbackName ?? ''} />
      : <Text style={styles.note}>Aperçu disponible dans l’app iOS.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { ...type.label, color: color.textMuted },
});
