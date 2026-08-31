import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BagRow } from '@/components/BagRow';
import { Button } from '@/components/Button';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { useAuth } from '@/features/auth/useAuth';
import { useSyncStatus } from '@/features/health/useSync';
import { itemCount } from '@/features/inventory/inventory';
import { useInventory } from '@/features/inventory/useInventory';
import { AttributeCard, LevelCard, WorkoutRow } from '@/features/progression/PlayerHomeView';
// Le type s'appelle `PlayerHome` comme le composant d'en dessous : on l'aliase plutôt que de
// renommer le composant, dont le nom est celui qu'on cherche en lisant l'écran.
import { usePlayerHome, type PlayerHome as HomeState } from '@/features/progression/usePlayerHome';

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
 * ————— Réglages a quitté cet écran (#99) ———————————————————————————————————————————————
 *
 * Le #57 en avait fait un bouton discret ici, sous l'archive, au motif qu'un geste rare n'a pas
 * besoin d'une place permanente dans la barre d'onglets. C'était juste tant que Réglages ne
 * portait que des interrupteurs de notification.
 *
 * Il porte désormais les autorisations (#81) et l'état de la synchronisation (#82) : on l'ouvre
 * pour savoir si la chaîne a fonctionné, donc souvent. Or un bouton posé **sous** l'historique
 * devient introuvable dès qu'un compte a des séances — c'est arrivé au lien vers Santé, et la
 * règle du résumé-puis-archive existe précisément pour ça. Il est donc passé dans la barre,
 * toujours à l'écran, et cet écran-ci n'a plus d'action du tout entre le résumé et l'archive.
 */
export default function Home() {
  const auth = useAuth();

  // La lecture et le geste vivent dans le même composant que le `ScrollView` qui les porte :
  // `RefreshControl` est une prop de la vue défilante, pas quelque chose qu'un enfant peut
  // installer. `PlayerHome` reçoit donc ce qu'il affiche au lieu de le chercher lui-même.
  const { home, reload, refresh, refreshFailure } = usePlayerHome();
  const { refresh: syncNow } = useSyncStatus();
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Tirer, c'est demander « qu'est-ce qui est neuf ? » — et dans GRRIND, le neuf ne vient pas
   * de l'API, il vient de Santé. Le geste **synchronise** donc avant de relire : un
   * rafraîchissement qui se contenterait de redemander les mêmes chiffres au serveur aurait
   * l'air de marcher sans rien faire.
   *
   * `sync('manual')` est aussi le seul déclencheur qui **ignore le seuil de trente secondes**.
   * C'est exactement ce qu'on veut ici : opposer « tu as déjà synchronisé il y a vingt
   * secondes » à quelqu'un qui vient de tirer sur son écran serait le moment où l'app a l'air
   * cassée.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Un `impact` et non un `notification` : ce retour accuse réception d'un geste, il ne
    // célèbre rien — la célébration appartient au franchissement de niveau.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await syncNow();
      // Puis la relecture, attendue : retirer le témoin à la fin de la synchronisation, avant
      // que les chiffres n'aient bougé, donnerait l'impression que le geste n'a rien fait.
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [syncNow, refresh]);

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={
        auth.status === 'signedIn' ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={color.accent}
          />
        ) : undefined
      }
    >
      {auth.status === 'signedIn' ? (
        <PlayerHome home={home} reload={reload} refreshFailure={refreshFailure} />
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
function PlayerHome({
  home,
  reload,
  refreshFailure,
}: {
  home: HomeState;
  reload: () => void;
  refreshFailure: Failure | null;
}) {
  // Une seule lecture de l'horloge pour toute la liste : deux séances de la même journée
  // ne doivent pas tomber de part et d'autre de minuit parce que le rendu a pris du temps.
  const now = new Date();

  return (
    <>
      {/* Un rafraîchissement qui a échoué **sans vider l'écran** : les chiffres d'en dessous
          sont ceux d'avant, et ils restent justes. Le dire à côté d'eux vaut mieux que de les
          remplacer par une page d'erreur, et mieux que de ne rien dire à quelqu'un qui vient
          de tirer trois fois. */}
      {refreshFailure === null ? null : (
        <Text style={styles.staleNotice}>{messageFor(refreshFailure)}</Text>
      )}

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
      {home.step === 'ready' ? (
        <AttributeCard
          attributes={home.progression.attributes}
          vitalityBreakdown={home.progression.vitalityBreakdown}
        />
      ) : null}

      {/* L'action, entre le résumé et l'archive — la place que le docblock de cet écran gardait
          libre depuis le #84. Elle se dessine même sans son résumé : elle est le seul chemin
          vers le sac, et une entrée qui n'apparaîtrait qu'une fois l'inventaire chargé serait
          introuvable exactement quand le réseau va mal. */}
      {home.step === 'ready' ? <BagEntry /> : null}

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

/**
 * L'entrée du sac, et son résumé.
 *
 * Elle lit `GET /api/inventory` pour n'en montrer que deux nombres — le solde et le compte —,
 * et c'est délibérément le **même cache** que l'écran du sac : ouvrir le sac depuis ici
 * n'attend donc rien, et l'aller-retour n'est pas payé deux fois.
 */
function BagEntry() {
  const inventory = useInventory();

  return (
    <BagRow
      summary={
        inventory.data === undefined
          ? undefined
          : { coins: inventory.data.coins, itemCount: itemCount(inventory.data) }
      }
      onPress={() => router.push('/inventaire')}
    />
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
  /** Le refus d'un rafraîchissement, au-dessus de chiffres qui restent valables. */
  staleNotice: { ...type.body, color: color.textMuted, textAlign: 'center' },
});
