import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { AttributeCard, LevelCard, WorkoutRow } from '@/features/progression/PlayerHomeView';
import { usePlayerHome } from '@/features/progression/usePlayerHome';

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
 * ————— Ce qui fermait la marche, et ne la ferme plus (#84) —————————————————————————————
 *
 * Une section « Outils de développement » vivait ici : le banc du rafraîchissement sérialisé
 * et quatre cartes qui rejouaient les fixtures. Elles ont servi à régler la mise en scène sans
 * aller faire du sport, et elles ne servent plus — elles occupaient le bas de l'écran d'accueil
 * d'une app qu'on fait essayer, sous un intitulé qui disait « ceci n'est pas fini ».
 *
 * **Les fixtures, elles, restent** (`src/features/reward/fixtures.ts`) : c'est sur elles que
 * `timeline.test.ts` prouve toute la séquence, sans monter un composant. Et `/reward` accepte
 * toujours son paramètre `fixture` — ce qui a disparu, c'est l'affordance, pas la porte.
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
        <View style={styles.card}>
          <Text style={styles.name}>Progression indisponible</Text>
          <Text style={styles.detail}>{messageFor(home.failure)}</Text>
          <Button label="Réessayer" onPress={reload} variant="quiet" />
        </View>
      ) : null}

      {home.step === 'ready' ? <LevelCard progression={home.progression} /> : null}
      {home.step === 'ready' ? <AttributeCard attributes={home.progression.attributes} /> : null}

      {home.step === 'ready' && home.workouts.length === 0 ? (
        <View style={styles.card}>
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

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  section: { ...type.label, color: color.textMuted, marginTop: space.md },
  loading: { paddingVertical: space.xl, alignItems: 'center' },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  name: { ...type.title, color: color.text },
  detail: { ...type.body, color: color.textMuted },
});
