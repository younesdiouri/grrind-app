import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { color, space, type } from '@/design/tokens';
import { DEFAULT_AVATAR, type Avatar } from '@/features/combat/serverAvatar';
import { AVATAR_LABELS } from './avatar.ts';

/** Text always describes the saved avatar; its actual 3D preview opens fullscreen. */
export function AvatarEntry({ avatar = DEFAULT_AVATAR, onPress, editable = false }: { avatar?: Avatar; onPress(): void; editable?: boolean }) {
  return <View style={styles.content} testID="combat-avatar-ready">
    <Text style={styles.title}>{AVATAR_LABELS.body[avatar.body]}</Text>
    <Text style={styles.detail}>{AVATAR_LABELS.faceStyle[avatar.faceStyle]} · {AVATAR_LABELS.noseStyle[avatar.noseStyle]}</Text>
    <Text style={styles.detail}>{AVATAR_LABELS.hairStyle[avatar.hairStyle]} · {AVATAR_LABELS.hairColor[avatar.hairColor]}</Text>
    <Text style={styles.detail}>{AVATAR_LABELS.skinTone[avatar.skinTone]} · {AVATAR_LABELS.eyeColor[avatar.eyeColor]}</Text>
    <Button label={editable ? 'Personnaliser mon apparence' : 'Voir le personnage en 3D'} variant="quiet" onPress={onPress} />
  </View>;
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', gap: space.md, padding: space.md },
  title: { ...type.title, color: color.text, textAlign: 'center' },
  detail: { ...type.body, color: color.textMuted, textAlign: 'center' },
});
