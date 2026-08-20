import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '@/api/client';
import { Button } from '@/components/Button';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor } from '@/features/auth/problems';
import { refreshAttempts, signOut, type UserProfile } from '@/features/auth/session';
import { useAuth } from '@/features/auth/useAuth';
import { LevelCard, WorkoutRow } from '@/features/progression/PlayerHomeView';
import { usePlayerHome } from '@/features/progression/usePlayerHome';
import { FIXTURES, type FixtureName } from '@/features/reward/fixtures';

/**
 * L'accueil.
 *
 * ————— L'ordre est le sujet de cet écran ————————————————————————————————————————————
 *
 * **Ce qu'on peut faire passe avant ce qu'on a fait.** L'historique est un fond de page :
 * onze séances font trois écrans de défilement, et tout ce qui se retrouve dessous n'existe
 * plus. C'est arrivé au lien vers Santé, qui est devenu introuvable le jour où le compte de
 * test a eu des séances — en développement il en avait zéro, donc personne ne l'a vu.
 *
 * D'où la règle : le résumé, l'action, **puis** l'archive. Elle tient toujours (#41) même si
 * Santé n'en est plus l'illustration : l'accès y passe désormais par l'onglet, toujours à
 * l'écran, plutôt que par une carte qui redevenait introuvable à l'échelle. Une action future
 * reprendrait sa place entre le résumé et l'archive.
 *
 * Les bancs de développement ferment la marche, sous un intitulé qui dit ce qu'ils sont. Ils
 * restent parce que les fixtures sont le seul moyen de rejouer la mise en scène sans aller
 * faire du sport, et le banc de session le seul moyen de provoquer un rafraîchissement.
 *
 * ————— Réglages (#57) ——————————————————————————————————————————————————————————————————
 *
 * Pas un quatrième onglet : un geste rare n'a pas besoin d'une place permanente dans la barre.
 * Un bouton discret, sous l'archive plutôt qu'au-dessus — la règle du résumé-puis-archive ne
 * s'applique qu'à ce qui se consulte souvent, et personne n'ouvre ses réglages en arrivant.
 */
export default function Home() {
  const auth = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {auth.status === 'signedIn' ? <PlayerHome /> : null}

      {auth.status === 'signedIn' ? (
        <Button label="Réglages" onPress={() => router.push('/reglages')} variant="quiet" />
      ) : null}

      <Text style={styles.section}>Outils de développement</Text>

      {auth.status === 'signedIn' ? <SessionBench user={auth.user} /> : null}

      <Text style={styles.intro}>
        Quatre réponses réelles du back, capturées sous l&apos;équilibrage v1. Toucher
        l&apos;écran pendant la séquence la saute.
      </Text>

      {(Object.keys(FIXTURES) as FixtureName[]).map((name) => {
        const summary = FIXTURES[name];
        const levels = summary.imported.flatMap((workout) => workout.level.reached);

        return (
          <Link key={name} href={{ pathname: '/reward', params: { fixture: name } }} asChild>
            {/* `asChild` clone l'enfant avec `onPress` : il faut donc un composant qui l'émette.
                Une `View` l'ignore silencieusement sur natif — la carte n'est alors pas tapable. */}
            <Pressable style={styles.card}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.detail}>
                {summary.imported.length} séance{summary.imported.length > 1 ? 's' : ''} ·{' '}
                {summary.totals === null
                  ? 'rien de crédité'
                  : `+${summary.totals.xpAwarded} XP`}
                {levels.length > 0 ? ` · niveau ${levels.join(', ')}` : ''}
                {summary.skipped.length > 0
                  ? ` · ${summary.skipped.length} écartée${summary.skipped.length > 1 ? 's' : ''}`
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
 * Le joueur : son niveau, puis ce qu'il a fait — **dans cet ordre**.
 *
 * Santé n'a plus de carte ici (#41) : elle ferait doublon avec l'onglet, toujours à l'écran,
 * et garder les deux chemins pour une même destination n'en apprend aucun. La hiérarchie
 * résumé-puis-archive de #31 tient malgré tout ; c'est juste qu'il n'y a plus d'action entre
 * les deux pour l'instant.
 *
 * L'état vide n'est pas un échec et ne se présente pas comme tel : un compte neuf n'a rien
 * fait, ce qui est le point de départ normal du produit et pas une panne à réessayer.
 */
function PlayerHome() {
  const { home, reload } = usePlayerHome();
  // Une seule lecture de l'horloge pour toute la liste : deux séances de la même journée
  // ne doivent pas tomber de part et d'autre de minuit parce que le rendu a pris du temps.
  const now = new Date();

  return (
    <>
      {home.step === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : null}

      {home.step === 'failed' ? (
        <View style={styles.bench}>
          <Text style={styles.name}>Progression indisponible</Text>
          <Text style={styles.detail}>{messageFor(home.failure)}</Text>
          <Button label="Réessayer" onPress={reload} variant="quiet" />
        </View>
      ) : null}

      {home.step === 'ready' ? <LevelCard progression={home.progression} /> : null}

      {home.step === 'ready' && home.workouts.length === 0 ? (
        <View style={styles.bench}>
          <Text style={styles.name}>Aucune séance</Text>
          <Text style={styles.detail}>
            Tes séances apparaîtront ici dès la première synchronisation avec Santé.
          </Text>
        </View>
      ) : null}

      {home.step === 'ready' && home.workouts.length > 0 ? (
        <>
          <Text style={styles.section}>
            {home.workouts.length} séance{home.workouts.length > 1 ? 's' : ''}
            {home.hasMore ? ' (les plus récentes)' : ''}
          </Text>
          {home.workouts.map((workout) => (
            <WorkoutRow key={workout.id} workout={workout} now={now} />
          ))}
        </>
      ) : null}
    </>
  );
}

/**
 * Le banc du refresh sérialisé.
 *
 * Il lance **deux requêtes en même temps** sur le vrai serveur et compte les
 * rafraîchissements partis. Ce que ça dit dépend de l'âge du jeton d'accès, et les deux
 * lectures sont utiles :
 *
 * - Jeton frais → `2/2 réponses · 0 rafraîchissement`. Le `Bearer` est posé, les types du
 *   contrat se décodent.
 * - Jeton de plus de quinze minutes → `2/2 réponses · 1 rafraîchissement`. C'est *la*
 *   vérification du ticket. À deux, le back a révoqué la famille, et la prochaine ouverture
 *   le prouvera en retombant sur l'écran de connexion.
 *
 * Il n'y a plus de bouton pour forcer l'expiration : le serveur distingue désormais les trois
 * refus du jeton d'accès, et un jeton inventé n'est pas *expiré* mais **invalide** — ce qui
 * déconnecte, à raison. On attend donc la vraie expiration, ce qui a le mérite de tester le
 * chemin réel plutôt qu'un chemin voisin.
 */
function SessionBench({ user }: { user: UserProfile }) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setVerdict(null);

    const before = refreshAttempts();
    const replies = await Promise.all([api.GET('/api/me'), api.GET('/api/me')]);

    const served = replies.filter((reply) => reply.data !== undefined).length;
    const spent = refreshAttempts() - before;

    setVerdict(
      `${served}/2 réponses · ${spent} rafraîchissement${spent > 1 ? 's' : ''}` +
        (served === 2 && spent <= 1 ? ' ✓' : ' ✗'),
    );
    setBusy(false);
  };

  return (
    <View style={styles.bench}>
      <Text style={styles.name}>{user.displayName}</Text>
      <Text style={styles.detail}>
        {user.email} · {user.timezone}
      </Text>

      <Button label="Lancer deux requêtes simultanées" onPress={() => void run()} busy={busy} />
      {verdict !== null ? <Text style={styles.verdict}>{verdict}</Text> : null}
      <Text style={styles.detail}>
        Après quinze minutes d&apos;inactivité, le jeton est réellement expiré : un seul
        rafraîchissement doit partir.
      </Text>

      <Button label="Se déconnecter" onPress={() => void signOut()} variant="quiet" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  intro: { ...type.body, color: color.textMuted },
  section: { ...type.label, color: color.textMuted, marginTop: space.md },
  loading: { paddingVertical: space.xl, alignItems: 'center' },
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
