import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { color, radius, space, type } from '@/design/tokens';
import { messageFor } from '@/features/auth/problems';
import type { SyncResult } from '@/features/health/sync';
import { useHealthAccess } from '@/features/health/useHealthAccess';
import { useSync } from '@/features/health/useSync';

/**
 * L'écran de la santé, écrit **pour** l'ambiguïté d'iOS et non autour d'elle.
 *
 * ————— Ce qu'on ne peut pas dire ————————————————————————————————————————————————————————
 *
 * **Jamais « accès refusé ».** HealthKit ne dit pas si une autorisation de lecture a été
 * refusée : en lecture, l'API rend le même `notDetermined` que l'utilisateur ait accepté ou
 * décoché. La seule chose observable est « la requête ne rend aucun workout » — ce qui est
 * aussi ce que voit une app dont l'utilisateur n'a pas fait de sport cette semaine.
 *
 * D'où la formulation de l'écran vide : « aucune activité trouvée », plus un chemin explicite
 * vers Réglages, **sans jamais accuser l'utilisateur d'avoir refusé quoi que ce soit**. S'il a
 * décoché, il trouve la porte ; s'il n'a rien fait de la semaine, on ne lui reproche rien.
 *
 * ————— Ce qu'on dit avant la feuille système ——————————————————————————————————————————
 *
 * La feuille d'Apple a une case par type et **ne se rejoue pas** : un utilisateur qui décoche
 * par réflexe n'a pas de seconde chance dans l'app. Il faut donc avoir dit avant ce qu'on lit
 * et pourquoi, et c'est tout l'objet de l'étape `explain`.
 *
 * ————— Ce dont on ne parle pas —————————————————————————————————————————————————————————
 *
 * **De montre.** Apple Santé contient aussi les séances enregistrées depuis l'iPhone ou par
 * d'autres applications — Strava, Nike Run Club, Garmin Connect. Faire de la montre le sujet
 * exclurait des utilisateurs qui pourraient jouer dès aujourd'hui.
 */
export default function SanteScreen() {
  const { access, ask } = useHealthAccess();
  const { status, refresh } = useSync();

  if (access.step === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={color.accent} />
      </View>
    );
  }

  if (access.step === 'unavailable') {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.title}>La santé n&apos;est pas disponible ici</Text>
        <Text style={styles.body}>
          Cet appareil ne donne pas accès aux données de santé. GRRIND a besoin d&apos;un iPhone
          pour lire tes séances.
        </Text>
      </ScrollView>
    );
  }

  if (access.step === 'failed') {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.title}>La demande n&apos;a pas abouti</Text>
        <Text style={styles.body}>{access.message}</Text>
        <Button label="Réessayer" onPress={ask} />
      </ScrollView>
    );
  }

  // Avant la feuille système : on explique, parce qu'elle ne se rejoue pas.
  if (access.step === 'explain' || access.step === 'asking') {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.title}>Tes séances font monter ton personnage</Text>

        <Text style={styles.body}>
          GRRIND lit ce qui est déjà enregistré dans Apple Santé — tes courses, tes sorties
          vélo, tes séances de muscu — et le transforme en expérience. Rien à lancer, rien à
          chronométrer : tu fais ton sport, ton personnage progresse.
        </Text>

        {/* On ne parle pas de montre : Santé contient aussi ce que l'iPhone et les autres
            applications y écrivent, et faire de la montre le sujet exclurait des joueurs. */}
        <Text style={styles.body}>
          Peu importe comment tu enregistres tes séances : depuis ton iPhone, une montre, ou une
          autre application qui écrit dans Santé.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ce que GRRIND va lire</Text>
          <Text style={styles.item}>Tes séances de sport, avec leur date et leur durée</Text>
          <Text style={styles.item}>La distance parcourue</Text>
          <Text style={styles.item}>Les calories actives</Text>
          <Text style={styles.item}>La fréquence cardiaque moyenne</Text>
          <Text style={styles.item}>Le dénivelé, quand il est mesuré</Text>
        </View>

        {/* Le point qui justifie tout cet écran. */}
        <Text style={styles.warning}>
          L&apos;écran suivant est celui d&apos;Apple, avec une case par donnée.{' '}
          <Text style={styles.emphasis}>Il ne s&apos;affichera qu&apos;une fois</Text> — si tu
          décoches quelque chose, il faudra passer par Réglages pour revenir dessus.
        </Text>

        <Text style={styles.body}>
          GRRIND n&apos;écrit jamais dans Santé et ne lit rien d&apos;autre.
        </Text>

        <Button
          label="Autoriser l'accès à Santé"
          onPress={ask}
          busy={access.step === 'asking'}
        />
      </ScrollView>
    );
  }

  // `asked` : la question a été posée. Ce qu'on montre maintenant vient de la synchronisation,
  // seul témoin de ce qui remonte réellement.
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {status.phase === 'syncing' || status.phase === 'idle' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.accent} />
          <Text style={styles.body}>Lecture de tes séances…</Text>
        </View>
      ) : (
        <Settled result={status.result} onRetry={refresh} />
      )}
    </ScrollView>
  );
}

function Settled({ result, onRetry }: { result: SyncResult; onRetry: () => void }) {
  switch (result.kind) {
    case 'summary': {
      const count = result.summary.imported.length;

      if (count === 0) {
        // Un import où tout est écarté est un succès, pas une panne. Le plus souvent c'est
        // « déjà comptées » — l'utilisateur rouvre l'app pour la troisième fois de la journée.
        return (
          <>
            <Text style={styles.title}>Tout est déjà à jour</Text>
            <Text style={styles.body}>
              Aucune nouvelle séance depuis la dernière fois. Reviens après ta prochaine sortie.
            </Text>
            <Button label="Revérifier" onPress={onRetry} variant="quiet" />
          </>
        );
      }

      return (
        <>
          <Text style={styles.title}>
            {count} séance{count > 1 ? 's' : ''} à jouer
          </Text>
          <Text style={styles.body}>
            +{result.summary.totals?.xpAwarded ?? 0} XP t&apos;attendent.
          </Text>
          <Button label="Voir" onPress={() => router.push('/reward')} />
        </>
      );
    }

    // **Le cœur du ticket.** On ne sait pas si l'utilisateur a refusé ou s'il n'a rien fait de
    // sa semaine, et iOS ne le dira jamais. On décrit donc ce qu'on observe, on offre la
    // porte, et on n'accuse personne.
    case 'nothingToSend':
      return (
        <>
          <Text style={styles.title}>Aucune activité trouvée</Text>
          <Text style={styles.body}>
            GRRIND n&apos;a rien trouvé à importer. C&apos;est normal s&apos;il n&apos;y a pas eu
            de séance récemment.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Si tu as fait du sport</Text>
            <Text style={styles.body}>
              Vérifie que GRRIND a bien accès à Santé :
            </Text>
            <Text style={styles.path}>
              Réglages › Confidentialité et sécurité › Santé › GRRIND
            </Text>
            {/* `openSettings()` ouvre la page de GRRIND dans Réglages. Les interrupteurs de
                Santé, eux, vivent sous Confidentialité et sécurité — d'où le chemin écrit en
                toutes lettres au-dessus, qui reste vrai quoi qu'ouvre le bouton. */}
            <Button
              label="Ouvrir Réglages"
              onPress={() => void Linking.openSettings()}
              variant="quiet"
            />
          </View>

          <Button label="Revérifier" onPress={onRetry} />
        </>
      );

    case 'unavailable':
      return (
        <>
          <Text style={styles.title}>La santé n&apos;est pas disponible ici</Text>
          <Text style={styles.body}>
            Cet appareil ne donne pas accès aux données de santé.
          </Text>
        </>
      );

    case 'failed':
      return (
        <>
          <Text style={styles.title}>La synchronisation a échoué</Text>
          <Text style={styles.body}>{messageFor(result.failure)}</Text>
          <Button label="Réessayer" onPress={onRetry} />
        </>
      );
  }
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  title: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
  emphasis: { color: color.text },
  warning: { ...type.body, color: color.textMuted },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  cardTitle: { ...type.label, color: color.text },
  item: { ...type.body, color: color.textMuted },
  path: { ...type.body, color: color.text },
});
