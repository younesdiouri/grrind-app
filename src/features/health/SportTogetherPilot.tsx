import { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';

import { Button } from '@/components/Button';
import { color, radius, space, type } from '@/design/tokens';
import { sportNative } from '@/features/health/sportNative';
import { useAuth } from '@/features/auth/useAuth';
import type { SportStatus, SportWorkout } from '../../../modules/grrind-health/src/SportTogether.types';

/** Banc terrain dev : aucun chiffre de groupe ou d'XP n'est décidé ici. */
export function SportTogetherPilot() {
  const auth = useAuth();
  const [status, setStatus] = useState<SportStatus | null>(null);
  const [workouts, setWorkouts] = useState<SportWorkout[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = async () => { if (sportNative) setStatus(await sportNative.sportStatus()); };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try { await action(); await refresh(); }
    catch { setMessage('La collecte n’a pas abouti. Vérifie les autorisations ou réessaie.'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    const update = () => { void refresh().catch(() => setMessage('Stockage local indisponible.')); };
    update();
    const timer = setInterval(() => { if (AppState.currentState === 'active') update(); }, 3000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  if (!__DEV__) return null;
  if (!sportNative) return <Text style={styles.body}>Installe le development build du pilote sur iPhone.</Text>;
  const native = sportNative;
  const active = status?.activeCaptureId != null;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.title}>Sport ensemble · pilote terrain</Text>
      <Text style={styles.body}>Ce pilote conserve les positions sur cet iPhone. Aucun envoi ni bonus de groupe. Les séances et leur XP continuent de venir de Santé et du serveur.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Téléphone · activer avant le sport</Text>
        <Text style={styles.body}>GRRIND utilise ta localisation pendant cette séance pour reconnaître le sport ensemble.</Text>
        <Text style={styles.body}>Garde ton enregistrement Santé habituel. La capture ne crée aucune séance. Elle continue écran verrouillé si iOS le permet, avec l’indicateur de localisation. Arrêt de sécurité après 4 h ; une app arrêtée de force doit être réactivée manuellement. Aucune position passée n’est reconstituée.</Text>
        <Text style={styles.body}>Localisation : {status?.permission.permission ?? '…'} · {status?.permission.precise ? 'précise' : 'approximative'}. L’absence de positions n’empêche pas l’XP solo.</Text>
        <Button label={active ? 'Arrêter la localisation' : 'Activer pour cette séance'} busy={busy && !active}
          onPress={() => {
            if (active) {
              void native.stopSportCapture().then(refresh).catch(() => setMessage('L’arrêt n’a pas abouti. Réessaie.'));
              return;
            }
            void run(async () => {
            const permission = await native.requestSportLocation();
            if (permission.permission !== 'allowed') { setMessage('Localisation refusée. Tu peux continuer sans elle ou ouvrir Réglages.'); return; }
            if (auth.status === 'signedIn') await native.startSportCapture(auth.user.id);
            });
          }} />
        <Button label="Réglages de localisation" variant="quiet" onPress={() => void Linking.openSettings()} />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Routes Santé · relire après synchronisation de la montre</Text>
        <Text style={styles.body}>Autorise les itinéraires pour vérifier ce que ta montre ou ton app écrit réellement. Une route absente peut être non partagée ou arriver plus tard ; ce constat ne prouve pas une séance solo.</Text>
        <Button label="Autoriser et lire les séances récentes" busy={busy} onPress={() => void run(async () => {
          await native.requestSportRoutes(); setWorkouts(await native.sportWorkouts());
        })} />
        {workouts.map((workout) => (
          <View key={workout.externalId} style={styles.card}>
            <Text style={styles.label}>{new Date(workout.startedAt).toLocaleString('fr-FR')}</Text>
            <Text style={styles.body}>{workout.provider} · {workout.device} · type Santé brut {workout.activityType}</Text>
            <Button label="Relire les routes de cette séance" variant="quiet" busy={busy} onPress={() => void run(async () => {
              await native.collectSportRoutes(workout.externalId);
              const next = await native.sportStatus();
              if (!next.captures.some((capture) => capture.workoutId === workout.externalId)) setMessage('Aucune route lisible pour cette séance. Réessaie après la synchronisation de la montre.');
            })} />
          </View>
        ))}
      </View>
      {message ? <Text accessibilityRole="alert" style={styles.body}>{message}</Text> : null}
      {status?.storageFailed ? <Text accessibilityRole="alert" style={styles.body}>Échec d’écriture : la capture téléphone est arrêtée. Les dernières mesures peuvent manquer.</Text> : null}
      <Text style={styles.label}>Mesures locales · aucune coordonnée affichée</Text>
      {status?.captures.map((capture) => (
        <View key={capture.id} style={styles.card}>
          <Text selectable style={styles.body}>{capture.origin} · {capture.state} · {new Date(capture.startedAt).toLocaleString('fr-FR')}</Text>
          <Text selectable style={styles.body}>{capture.pointCount} points · trou interne max {Math.round(capture.maxGapSeconds)} s · précision la moins bonne {capture.worstAccuracyMeters === null ? '—' : Math.round(capture.worstAccuracyMeters)} m</Text>
          <Text style={styles.body}>Premier point : {capture.firstPointAt === null ? '—' : new Date(capture.firstPointAt).toLocaleTimeString('fr-FR')} · dernier : {capture.lastPointAt === null ? '—' : new Date(capture.lastPointAt).toLocaleTimeString('fr-FR')}</Text>
        </View>
      ))}
      <Text style={styles.body}>Conservation locale limitée à 30 jours, exclue des sauvegardes. Suppression des données expirées à la prochaine exécution de GRRIND. Efface les mesures dès le relevé terrain terminé.</Text>
      <Button label="Effacer les mesures de ce compte" variant="quiet" busy={busy} onPress={() => void run(() => native.clearSportEvidence())} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.lg },
  card: { padding: space.md, gap: space.md, borderRadius: radius.md, backgroundColor: color.surface },
  title: { ...type.title, color: color.text },
  label: { ...type.label, color: color.text },
  body: { ...type.body, color: color.textMuted },
});
