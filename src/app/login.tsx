import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { color, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { signIn } from '@/features/auth/session';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setFailure(null);

    const outcome = await signIn(email.trim(), password);

    // En cas de succès, le garde du layout racine déplace l'app tout seul : il n'y a rien à
    // naviguer ici, et cet écran est démonté avant que `setBusy` ait à s'exécuter.
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
        <Text style={styles.intro}>Reprends là où tu t&apos;es arrêté.</Text>

        <Field
          label="Adresse e-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          editable={!busy}
        />

        <Field
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          editable={!busy}
        />

        {failure !== null ? <Text style={styles.failure}>{messageFor(failure)}</Text> : null}

        <Button label="Se connecter" onPress={() => void submit()} busy={busy} />

        <Button
          label="Créer un compte"
          onPress={() => router.push('/register')}
          variant="quiet"
          disabled={busy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { padding: space.lg, gap: space.md },
  intro: { ...type.body, color: color.textMuted, marginBottom: space.sm },
  failure: { ...type.body, color: color.danger },
});
