import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { color, radius, space, type } from '@/design/tokens';

type FieldProps = TextInputProps & {
  label: string;
  /**
   * Le message d'erreur **de ce champ**.
   *
   * Il vient d'une violation du 422, qui nomme son champ : le message s'accroche donc sous
   * l'entrée fautive au lieu d'aller grossir un bandeau générique en haut du formulaire.
   */
  error?: string;
};

export function Field({ label, error, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={label}
        {...input}
        style={[styles.input, error !== undefined && styles.inputInvalid, style]}
        placeholderTextColor={color.textMuted}
        selectionColor={color.accent}
      />
      {error !== undefined ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { ...type.label, color: color.textMuted },
  input: {
    ...type.body,
    color: color.text,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  inputInvalid: { borderColor: color.danger },
  error: { ...type.label, color: color.danger, letterSpacing: 0 },
});
