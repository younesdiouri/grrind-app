import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { color, space, type } from '@/design/tokens';
import { messageFor, violationsByField, type Failure } from '@/features/auth/problems';
import { register } from '@/features/auth/session';

/**
 * Le fuseau de l'appareil.
 *
 * **Le streak et le plafond quotidien se calculent dedans**, et le contrat en fait un attribut
 * de profil que le serveur ne déduit jamais. C'est donc au client de le déclarer à
 * l'inscription — et à l'utilisateur de le corriger depuis son profil s'il déménage, ce que
 * personne ne peut deviner à sa place.
 */
function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);

  const violations = failure === null ? {} : violationsByField(failure);

  const submit = async () => {
    setBusy(true);
    setFailure(null);

    const outcome = await register({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
      timezone: deviceTimezone(),
    });

    // Le compte est ouvert **et la session aussi** : le contrat rend une `AuthSession` sur le
    // 201, donc il n'y a pas de connexion à enchaîner. Le garde du layout racine fait le
    // reste.
    if (!outcome.ok) {
      setFailure(outcome.failure);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Ton pseudo est ce que les autres verront. Le reste se gagne.
        </Text>

        <Field
          label="Pseudo"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoComplete="username"
          maxLength={40}
          returnKeyType="next"
          editable={!busy}
          error={violations.displayName}
        />

        <Field
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          maxLength={180}
          returnKeyType="next"
          editable={!busy}
          error={violations.email}
        />

        <Field
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          secureTextEntry
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          editable={!busy}
          error={violations.password}
        />
        {/* Le minimum vient du contrat (`minLength: 12`), et il est **annoncé** plutôt que
            revalidé ici : rappeler une règle ne la duplique pas, la rejouer si. Le refus, lui,
            reste celui du serveur — il arrive en 422, nommé par champ. */}
        <Text style={styles.hint}>Douze caractères au minimum.</Text>

        {failure !== null ? <Text style={styles.failure}>{messageFor(failure)}</Text> : null}

        <Button label="Créer mon compte" onPress={() => void submit()} busy={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { padding: space.lg, gap: space.md },
  intro: { ...type.body, color: color.textMuted, marginBottom: space.sm },
  hint: { ...type.label, color: color.textMuted, letterSpacing: 0, marginTop: -space.sm },
  failure: { ...type.body, color: color.danger },
});
