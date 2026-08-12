import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { Button } from '@/components/Button';
import { color, radius, space, type } from '@/design/tokens';
import {
  expireAccessTokenForTesting,
  refreshAttempts,
  signOut,
  type UserProfile,
} from '@/features/auth/session';
import { useAuth } from '@/features/auth/useAuth';
import { FIXTURES, type FixtureName } from '@/features/reward/fixtures';

/**
 * Le sélecteur de fixtures du spike.
 *
 * Il n'a aucune vocation à survivre : c'est un banc d'essai pour jouer les trois cas réels
 * capturés sur le back, sur un appareil physique, sans réseau. Ce qu'on regarde ici, c'est
 * si React Native tient l'écran signature du produit — pas si l'écran est joli.
 */
export default function SpikeIndex() {
  const auth = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {auth.status === 'signedIn' ? <SessionBench user={auth.user} /> : null}

      <Text style={styles.intro}>
        Trois réponses réelles du back, capturées sous l&apos;équilibrage v1. Toucher
        l&apos;écran pendant la séquence la saute.
      </Text>

      {(Object.keys(FIXTURES) as FixtureName[]).map((name) => {
        const summary = FIXTURES[name];
        return (
          <Link key={name} href={{ pathname: '/reward', params: { fixture: name } }} asChild>
            {/* `asChild` clone l'enfant avec `onPress` : il faut donc un composant qui l'émette.
                Une `View` l'ignore silencieusement sur natif — la carte n'est alors pas tapable. */}
            <Pressable style={styles.card}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.detail}>
                {summary.xp.awarded > 0 ? '+' : ''}
                {summary.xp.awarded} XP · {summary.xp.breakdown.length} ligne
                {summary.xp.breakdown.length > 1 ? 's' : ''} ·{' '}
                {summary.level.reached.length > 0
                  ? `niveau ${summary.level.reached.join(', ')}`
                  : 'aucun niveau'}
                {summary.titlesUnlocked.length > 0
                  ? ` · ${summary.titlesUnlocked.length} titre`
                  : ''}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}

/**
 * Le banc du refresh sérialisé.
 *
 * Il rejoue la seule situation qui casse la session sans prévenir : le JWT est périmé et
 * **deux requêtes partent en même temps**. Le résultat attendu est « 2/2 réponses ·
 * 1 rafraîchissement ». À deux rafraîchissements, le back a déjà révoqué la famille — la
 * prochaine ouverture de l'app le prouvera en retombant sur l'écran de connexion.
 */
function SessionBench({ user }: { user: UserProfile }) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setVerdict(null);

    const before = refreshAttempts();
    expireAccessTokenForTesting();

    const replies = await Promise.all([api.GET('/api/me'), api.GET('/api/me')]);

    const served = replies.filter((reply) => reply.data !== undefined).length;
    const spent = refreshAttempts() - before;

    setVerdict(
      `${served}/2 réponses · ${spent} rafraîchissement${spent > 1 ? 's' : ''}` +
        (served === 2 && spent === 1 ? ' ✓' : ' ✗'),
    );
    setBusy(false);
  };

  return (
    <View style={styles.bench}>
      <Text style={styles.name}>{user.displayName}</Text>
      <Text style={styles.detail}>
        {user.email} · {user.timezone}
      </Text>

      <Button
        label="Périmer le JWT, lancer deux requêtes"
        onPress={() => void run()}
        busy={busy}
      />
      {verdict !== null ? <Text style={styles.verdict}>{verdict}</Text> : null}

      <Button label="Se déconnecter" onPress={() => void signOut()} variant="quiet" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  intro: { ...type.body, color: color.textMuted },
  bench: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  verdict: { ...type.body, color: color.text, textAlign: 'center' },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  name: { ...type.title, color: color.text },
  detail: { ...type.body, color: color.textMuted },
});
