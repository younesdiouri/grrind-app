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

        {failure !== null ? <Text style={styles.failure}>{describe(failure)}</Text> : null}

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

/**
 * Le seul endroit du client qui se branche sur un code HTTP, et c'est un contournement.
 *
 * Le back **envoie** bien un `type` pour ce cas — `https://grrind.app/problems/invalid-credentials`,
 * vérifié sur le serveur — mais l'énumération des `type` du contrat ne le déclare pas. Le
 * client ne peut donc pas l'écrire : ce serait recopier à la main une valeur que
 * `openapi.yaml` ne connaît pas, et le `switch` exhaustif de `problems.ts` la rejetterait.
 *
 * On se rabat sur le statut, au seul endroit où il n'y a aucune ambiguïté possible : cette
 * route n'a que deux réponses. **La correction est côté back** — ajouter la valeur à l'enum
 * du contrat — et ce cas disparaît alors tout seul.
 */
function describe(failure: Failure): string {
  if (failure.kind === 'problem' && failure.status === 401) {
    return 'Adresse ou mot de passe incorrect.';
  }

  return messageFor(failure);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { padding: space.lg, gap: space.md },
  intro: { ...type.body, color: color.textMuted, marginBottom: space.sm },
  failure: { ...type.body, color: color.danger },
});
