import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { DEFAULT_AVATAR, serverAvatar, type Avatar, type AvatarEquipment } from '@/features/combat/serverAvatar';
import { AVATAR_FIELDS, AVATAR_LABELS } from './avatar.ts';
import { AvatarPreview } from '@/features/avatar/AvatarPreview';

/** The card and fullscreen editor both render the saved model with its actual equipment. */
export function AvatarEntry({ avatar = DEFAULT_AVATAR, equipment = {}, onPress, editable = false }: {
  avatar?: Avatar; equipment?: AvatarEquipment; onPress(): void; editable?: boolean;
}) {
  const label = AVATAR_FIELDS.map(field => (AVATAR_LABELS[field] as Record<string, string>)[avatar[field]]).join(' · ');
  return <View style={styles.content}>
    <AvatarPreview avatar={serverAvatar(avatar, equipment)} label={label} />
    <Text style={styles.detail} numberOfLines={1}>{AVATAR_LABELS.body[avatar.body]} · {AVATAR_LABELS.hairStyle[avatar.hairStyle]}</Text>
    <Button label={editable ? 'Personnaliser mon apparence' : 'Voir le personnage en 3D'} variant="quiet" onPress={onPress} />
  </View>;
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: space.xs, padding: space.sm },
  detail: { ...type.label, color: color.textMuted, textAlign: 'center' },
});
