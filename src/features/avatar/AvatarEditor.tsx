import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { color, control, frame, space, type } from '@/design/tokens';
import { messageFor, violationsByField, type Failure } from '@/features/auth/problems';
import { serverAvatar, type AvatarEquipment } from '@/features/combat/serverAvatar';
import { playerQueryKey } from '@/features/community/usePlayer';
import type { UserProfile } from '@/features/notifications/preferences';
import { saveAvatar } from './api';
import { AppearanceScene } from './AppearanceScene';
import { AVATAR_LABELS, avatarOptions, changeAvatar, normalizeAvatar, type AvatarCatalog, type AvatarField } from './avatar';
import { avatarProfileKey } from './useAvatarProfile';

const sections = { Corps: ['body', 'skinTone'], Traits: ['faceStyle', 'noseStyle'],
  Cheveux: ['hairStyle', 'hairColor'], Yeux: ['eyeColor'] } as const satisfies Record<string, readonly AvatarField[]>;

export function AvatarEditor({ profile, equipment, catalog }: { profile: UserProfile; equipment: AvatarEquipment; catalog: AvatarCatalog }) {
  const client = useQueryClient();
  const [saved, setSaved] = useState(() => normalizeAvatar(profile.avatar, catalog));
  const [draft, setDraft] = useState(saved);
  const [section, setSection] = useState<keyof typeof sections>('Corps');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const submit = async () => {
    if (busy || !dirty) return;
    setBusy(true); setFailure(null);
    const result = await saveAvatar(draft);
    if (result.ok) {
      const accepted = normalizeAvatar(result.profile.avatar, catalog);
      client.setQueryData(avatarProfileKey(profile.id), result.profile);
      void client.invalidateQueries({ queryKey: playerQueryKey(profile.id) });
      setSaved(accepted); setDraft(accepted);
    } else setFailure(result.failure);
    setBusy(false);
  };
  const fieldErrors = failure ? Object.values(violationsByField(failure)).join(' ') : '';
  return <AppearanceScene title="Mon apparence" avatar={serverAvatar(draft, equipment)} busy={busy}
    view={section === 'Corps' ? 0 : 1}>
    <View style={styles.row} accessibilityRole="tablist">
      {(Object.keys(sections) as (keyof typeof sections)[]).map(label => <Pressable key={label}
        testID={`avatar-section-${label}`} accessibilityRole="tab" accessibilityState={{ selected: section === label }}
        disabled={busy} onPress={() => setSection(label)} style={[styles.choice, section === label && styles.selected]}>
        <Text style={styles.label}>{label}</Text>
      </Pressable>)}
    </View>
    {sections[section].map(field => <View key={field} style={styles.row}>
      {avatarOptions(catalog, field, draft.body).map(value => <Pressable key={value} disabled={busy}
        testID={`avatar-option-${field}-${value}${draft[field] === value ? '-selected' : ''}`}
        accessibilityRole="button" accessibilityState={{ selected: draft[field] === value }}
        onPress={() => { setDraft(current => changeAvatar(current, field, value, catalog)); setFailure(null); }}
        style={[styles.choice, draft[field] === value && styles.selected]}>
        <Text style={styles.label}>{(AVATAR_LABELS[field] as Record<string, string>)[value]}</Text>
      </Pressable>)}
    </View>)}
    <Text style={styles.note} testID="avatar-save-status" accessibilityLiveRegion="polite">
      {busy ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' : 'Apparence enregistrée'}
    </Text>
    {failure && <Text style={styles.error} accessibilityRole="alert">{fieldErrors || messageFor(failure)}</Text>}
    <Button label="Enregistrer l’apparence" onPress={() => void submit()} busy={busy} disabled={!dirty} />
    {dirty && <Button label="Annuler les modifications" variant="quiet" disabled={busy}
      onPress={() => { setDraft(saved); setFailure(null); }} />}
  </AppearanceScene>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  choice: { minHeight: control.backSize, justifyContent: 'center', padding: space.sm,
    borderWidth: control.borderWidth, borderColor: color.border, borderRadius: frame.standard.radius },
  selected: { borderColor: color.accent },
  label: { ...type.label, letterSpacing: 0, color: color.text },
  note: { ...type.label, color: color.textMuted },
  error: { ...type.body, color: color.danger },
});
