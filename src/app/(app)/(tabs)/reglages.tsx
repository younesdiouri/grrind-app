import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { DangerRow } from '@/components/DangerRow';
import { ToggleRow } from '@/components/ToggleRow';
import { color, notificationCategoryLabel, radius, space, type } from '@/design/tokens';
import { messageFor, type Failure } from '@/features/auth/problems';
import { signOut } from '@/features/auth/session';
import { useAuth } from '@/features/auth/useAuth';
import {
  fetchProfile,
  updateNotificationPreference,
  type UserProfile,
} from '@/features/notifications/preferences';
import { requestPermissionAndRegister } from '@/features/notifications/registration';
import {
  useNotificationPermission,
  // Nommé explicitement : sans lui, `NotificationPermission` résout vers le type **du DOM**
  // que TypeScript embarque, dont les valeurs sont `'default' | 'denied' | 'granted'` — assez
  // proches pour compiler par accident, et fausses.
  type NotificationPermission,
} from '@/features/notifications/useNotificationPermission';
import { useHealthAccess } from '@/features/health/useHealthAccess';
import {
  getJournal,
  subscribeToJournal,
  type SessionLostEntry,
  type SyncJournal,
} from '@/features/diagnostics/journal';
import { formatRunDuration, hasOrphanedRun, runDurationSeconds } from '@/features/health/runDiagnostics';
import { useSyncStatus } from '@/features/health/useSync';
import { formatAgo } from '@/features/progression/format';

/**
 * Les réglages — #57, devenu le quatrième onglet au #99.
 *
 * ————— Ce qui a changé de nature ———————————————————————————————————————————————————————
 *
 * C'était une route poussée depuis l'accueil, atteinte par un geste rare, comme
 * `invite-code.tsx`. Ça se tenait tant que cet écran ne portait que les interrupteurs de
 * catégories de notification : on les règle une fois.
 *
 * Il porte depuis les **Autorisations** (#81) et l'état de la **Synchronisation** (#82) — ce
 * qu'on vient consulter pour savoir si la chaîne a fonctionné, donc souvent. Un bouton posé
 * sous l'historique de l'accueil devenait introuvable dès qu'un compte avait des séances. La
 * barre d'onglets est la seule surface toujours à l'écran, et c'est là qu'il fallait le mettre.
 *
 * Il n'y a donc plus de `Stack.Screen` ici : le titre vient de la barre d'onglets
 * (`(tabs)/_layout.tsx`), qui est désormais son parent.
 *
 * ————— La map, jamais une liste écrite en dur ——————————————————————————————————————————
 *
 * `notificationPreferences` (`GET /api/me`) est **toutes** les catégories connues du back,
 * jamais seulement celles coupées (#132) : cet écran itère sur `Object.keys(...)`, pas sur
 * l'enum `NotificationCategory` du contrat. Une catégorie ajoutée côté back doit apparaître
 * ici sans qu'on republie le client — c'est aussi pourquoi `notificationCategoryLabel`
 * (`design/tokens.ts`) est un `Partial` : une clé qu'il ne connaît pas encore s'affiche quand
 * même, brute, plutôt que de disparaître.
 *
 * ————— Les autorisations, avant tout le reste (#81) ——————————————————————————————————
 *
 * Si iOS n'a pas accordé les notifications, les interrupteurs ci-dessous ne veulent rien dire :
 * le serveur ne pousse plus rien vers cet appareil, quoi qu'ils affichent. D'où une section
 * en tête, et le principe qui la justifie :
 *
 * **Une autorisation doit pouvoir se donner depuis Réglages, à tout moment.** La lier à un
 * geste de produit — fonder une guilde, ouvrir l'onglet Santé — a du sens pour la *première*
 * fois : on demande quand la raison est évidente, et iOS ne repose jamais la question. Mais ce
 * ne peut pas être le **seul** chemin, sinon l'autorisation devient impossible à rattraper pour
 * qui a manqué le moment. C'était exactement le cas : la question n'était posée qu'au succès de
 * l'onglet Guilde, et un joueur sans guilde n'avait aucun moyen de l'obtenir.
 *
 * Les deux autorisations n'ont **pas** la même forme, et l'écran ne fait pas semblant :
 *
 * - **Notifications** : trois états lisibles, trois gestes. « Jamais demandé » se demande
 *   sur place, « refusé » passe par Réglages système, « accordé » ne propose rien.
 * - **Santé** : deux états observables, et **jamais « refusé »**. HealthKit rend
 *   `notDetermined` en lecture que l'utilisateur ait accepté ou décoché — c'est délibéré chez
 *   Apple, une app ne doit pas pouvoir déduire qu'on lui cache quelque chose. Voir le docblock
 *   de `useHealthAccess.ts`, qui est écrit pour cette ambiguïté.
 *
 * ————— Le compte, en dernier (#84) —————————————————————————————————————————————————————
 *
 * « Se déconnecter » vivait dans le banc de session de l'accueil, qui est parti avec les
 * outils de développement. Ce n'en était pas un : c'est un réglage, et sa place est ici.
 *
 * Il est **seul dans sa section**, sous tout le reste, en `DangerRow` — c'est la règle du
 * composant, et elle vaut : personne ne doit se déconnecter en visant un interrupteur de
 * notification. Il ne dépend pas de la requête de profil, qui peut échouer : l'identité
 * affichée vient de la session déjà en mémoire, et partir doit rester possible même quand le
 * serveur ne répond plus.
 */
export default function ReglagesScreen() {
  const { permission, refresh } = useNotificationPermission();
  const auth = useAuth();

  const [state, setState] = useState<
    { step: 'loading' } | { step: 'ready'; profile: UserProfile } | { step: 'failed'; failure: Failure }
  >({ step: 'loading' });

  // `load` ne touche jamais `state` avant l'attente réseau : l'état initial est déjà
  // `'loading'` (voir `useState` ci-dessus), donc rien à écrire de synchrone dans l'effet de
  // montage — seul `retry` (l'appui sur « Réessayer ») a besoin de repasser par `'loading'`.
  const load = () => {
    void fetchProfile().then((outcome) => {
      setState(
        outcome.ok ? { step: 'ready', profile: outcome.profile } : { step: 'failed', failure: outcome.failure },
      );
    });
  };

  useEffect(load, []);

  const retry = () => {
    setState({ step: 'loading' });
    load();
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Authorizations permission={permission} onAsked={refresh} />

      <Synchronisation />

      {state.step === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.accent} />
        </View>
      ) : null}

      {state.step === 'failed' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Les réglages sont indisponibles</Text>
          <Text style={styles.body}>{messageFor(state.failure)}</Text>
          <Button label="Réessayer" onPress={retry} variant="quiet" />
        </View>
      ) : null}

      {state.step === 'ready' ? <Preferences profile={state.profile} onProfile={(profile) => setState({ step: 'ready', profile })} /> : null}

      {auth.status === 'signedIn' ? (
        <View style={styles.account}>
          <Text style={styles.cardTitle}>{auth.user.displayName}</Text>
          <Text style={styles.body}>
            {auth.user.email} · {auth.user.timezone}
          </Text>
          <DangerRow label="Se déconnecter" onPress={() => void signOut()} />
        </View>
      ) : null}
    </ScrollView>
  );
}

/**
 * Où en est la synchronisation — et la seule chose qui réponde à « est-ce que ça marche ? ».
 *
 * ————— Ce qu'il y a à savoir, et pourquoi deux lignes plutôt qu'une ——————————————————
 *
 * Une séance qui remonte en arrière-plan n'a personne devant l'écran : son résumé va en file
 * et attend l'ouverture suivante pour se jouer. Entre les deux, rien ne se voyait. Et quand
 * rien n'arrive, deux causes très différentes se ressemblaient :
 *
 * - **l'observer HealthKit ne tourne pas** — l'inscription a échoué, ou l'autorisation manque ;
 * - **il tourne, et c'est le serveur qui n'a pas répondu** — le back dort (`fly.io` arrête la
 *   machine sans trafic) et le réveil ne dispose que de douze secondes sans rejeu pour toute la
 *   course, un budget dimensionné sur le chien de garde natif d'iOS, pas sur un démarrage à
 *   froid.
 *
 * Le second cas ne perd rien : l'ancre n'avance pas, la même différence se relit au réveil
 * suivant. Mais il fallait pouvoir les distinguer, et c'est exactement ce que les deux
 * premières lignes de ce bloc font.
 *
 * ————— La troisième réponse (#82, #140) ————————————————————————————————————————————————
 *
 * « Est-ce que l'observer tourne ? » a une réponse que ce bloc ne savait pas encore donner :
 * « il a tourné mais n'a pas eu le temps ». Deux formes, très différentes à l'écran :
 *
 * - **une course est en cours**, dans ce process précis — `useSyncStatus` le sait déjà, en
 *   mémoire, il n'y a rien à déduire du journal ;
 * - **une course a été interrompue** — le chien de garde natif l'a coupée avant qu'elle ait pu
 *   écrire quoi que ce soit (`hasOrphanedRun`, `runDiagnostics.ts`). Notre propre budget, lui,
 *   écrit toujours un verdict avant de rendre la main (`outcome: 'budgetExceeded'` plus bas) —
 *   ce n'est donc jamais lui qui produit ce second cas.
 *
 * ————— Combien de temps, pas seulement « interrompue » (complément du 2026-08-31) ———————
 *
 * Aucune course en arrière-plan n'a jamais abouti à un import crédité depuis le début du
 * développement du réveil : la notification « séance comptée » (`announce()`,
 * `backgroundWakeup.ios.ts`) n'est jamais partie. « Interrompue » ne suffit donc pas à décider
 * si les douze secondes du budget (`retryPolicy.ts`) sont la bonne valeur, ou si c'est tout le
 * reste — bootstrap, refresh, lecture HealthKit — qui déborde avant même de l'atteindre.
 *
 * `runDurationSeconds` (`runDiagnostics.ts`) répond à ça, sans rien ajouter au disque : la
 * durée se calcule à la lecture, sur les deux instants déjà notés. Elle rejoint la phrase de
 * `outcomeDetail()` — « Réglée en 1,3 s. » sur un verdict qui a fini par tomber, « Interrompue
 * après 12 s » sur notre propre abandon — et manque, seule, sur une course orpheline : on sait
 * qu'elle a duré au moins jusqu'au couperet natif, jamais combien.
 *
 * ————— Ce n'est pas un banc de développement ——————————————————————————————————————————
 *
 * Ils sont sortis de l'accueil au #84 et ne reviennent pas déguisés. « Dernière synchro il y a
 * quatre minutes » est une information qu'un joueur a de bonnes raisons de vouloir, et ce bloc
 * est écrit pour rester en production.
 *
 * ————— Pourquoi j'ai été déconnecté (#143) ——————————————————————————————————————————————
 *
 * Ce bloc répondait déjà à « est-ce que l'observer tourne ? ». Il répond maintenant aussi à
 * la question que le joueur se pose vraiment quand il retombe sur l'écran de connexion :
 * `journal.sessionLost` porte lequel des quatre points de `session.ts` a jeté la session, et
 * quand — jamais le jeton, sous aucune forme. Voir `sessionLostReason.ts`.
 */
function Synchronisation() {
  const journal = useSyncExternalStore(subscribeToJournal, getJournal);
  const { status, refresh } = useSyncStatus();
  // Une seule lecture de l'horloge pour tout le bloc : deux lignes de la même seconde ne
  // doivent pas se dater différemment parce que le rendu a pris du temps.
  const now = new Date();

  const syncing = status.phase === 'syncing';
  // Le process en cours l'emporte toujours sur le journal : lui seul sait qu'une course va
  // sortir par `noteSettled()` d'un instant à l'autre, ce que le disque seul ne peut pas dire.
  const interrupted = !syncing && hasOrphanedRun(journal);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Synchronisation</Text>

      {syncing ? (
        <Text style={styles.body}>Une synchronisation est en cours.</Text>
      ) : null}

      {interrupted ? (
        <Text style={styles.body}>
          Une synchronisation en arrière-plan a été interrompue avant d’obtenir une réponse du
          serveur. Rien n’est perdu : elle reprendra au prochain réveil ou à la prochaine
          ouverture.
        </Text>
      ) : null}

      <JournalLine
        label="Dernière synchronisation"
        value={journal.settledAt === null ? null : formatAgo(journal.settledAt, now)}
        detail={outcomeDetail(journal)}
      />

      {/* La ligne qui répond à la question. Vide depuis des jours : l'observer ne tourne pas.
          Récente alors que celle du dessus ne l'est pas : c'est le réseau ou le serveur. */}
      <JournalLine
        label="Dernier réveil en arrière-plan"
        value={journal.wokeAt === null ? null : formatAgo(journal.wokeAt, now)}
        detail={
          journal.wokeAt === null
            ? 'Apple Santé n’a encore jamais réveillé GRRIND sur cet appareil.'
            : null
        }
      />

      <JournalLine
        label="Inscription au réveil"
        value={
          journal.registration === null
            ? null
            : journal.registration === 'registered'
              ? 'active'
              : 'échouée'
        }
        detail={
          journal.registration === 'failed'
            ? 'Elle échoue tant que Santé n’a rien accordé. Vérifie l’autorisation ci-dessus.'
            : null
        }
      />

      {/* La question que le joueur se pose vraiment en retombant sur l'écran de connexion
          (#143, voir le docblock ci-dessus). Vide tant que `session.ts` n'a jamais jeté de
          session sur cet appareil — un premier lancement n'y compte pas, voir
          `sessionLostReason.ts`. */}
      <JournalLine
        label="Dernier abandon de session"
        value={journal.sessionLost === null ? null : formatAgo(journal.sessionLost.at, now)}
        detail={
          journal.sessionLost === null
            ? 'Aucune session n’a été jetée sur cet appareil.'
            : sessionLostDetail(journal.sessionLost)
        }
      />

      <Button
        label="Synchroniser maintenant"
        onPress={refresh}
        busy={syncing}
        variant="quiet"
      />
    </View>
  );
}

/**
 * Ce que la dernière synchronisation a produit, en une phrase — et combien de temps elle a
 * pris, quand la question a une réponse (`runDurationSeconds`, `runDiagnostics.ts`).
 *
 * Le refus est stocké **tel quel** sur le disque et rendu ici par `messageFor` : un message
 * figé au moment de l'écriture survivrait à sa propre correction.
 */
function outcomeDetail(journal: SyncJournal): string | null {
  const duration = runDurationSeconds(journal);

  switch (journal.outcome) {
    case null:
      return 'GRRIND n’a pas encore parlé au serveur sur cet appareil.';
    case 'summary':
      return withDuration(
        journal.imported === null || journal.imported === 0
          ? 'Rien de neuf à créditer.'
          : `${journal.imported} séance${journal.imported > 1 ? 's' : ''} créditée${journal.imported > 1 ? 's' : ''}.`,
        duration,
      );
    case 'nothingToSend':
      return withDuration('Aucune activité trouvée dans Santé.', duration);
    case 'unavailable':
      return withDuration('Cet appareil ne donne pas accès aux données de santé.', duration);
    case 'failed':
      return withDuration(
        journal.failure === null ? 'La synchronisation a échoué.' : messageFor(journal.failure),
        duration,
      );
    // Notre propre budget a coupé la course avant qu'un verdict ne tombe (#140) : ni un refus
    // du serveur, ni une panne réseau, donc pas `messageFor`. Rien n'est perdu. La durée mesure
    // ici le budget lui-même — c'est ce qui manquait pour savoir s'il est le bon.
    case 'budgetExceeded':
      return duration === null
        ? 'Interrompue avant d’obtenir une réponse du serveur. Rien n’est perdu : la prochaine synchronisation reprendra où celle-ci s’est arrêtée.'
        : `Interrompue après ${formatRunDuration(duration)} sans réponse du serveur. Rien n’est perdu : la prochaine synchronisation reprendra où celle-ci s’est arrêtée.`;
  }
}

/** Ajoute la mesure de la course à la fin de la phrase, quand elle existe. */
function withDuration(sentence: string, duration: number | null): string {
  return duration === null ? sentence : `${sentence} Réglée en ${formatRunDuration(duration)}.`;
}

/**
 * Pourquoi la dernière session a été jetée, en une phrase — lequel des quatre points de
 * `session.ts` a tiré. Jamais le jeton : `SessionLostReason` ne le porte pas, voir son
 * docblock (`sessionLostReason.ts`).
 *
 * `serverRefusal` se décline en deux phrases, pas une : « jeton de session » (le refresh
 * token, `refreshEndpoint`) et « jeton d'accès » (le JWT, `authenticatedRoute`) n'accusent pas
 * la même chose, et les confondre à l'écran referait disparaître la distinction que
 * `sessionLostReason.ts` a précisément faite remonter jusqu'ici.
 *
 * Un `switch` sur trois cas fixes, définis dans ce client : pas de `default` qui renvoie à
 * `never`, cette exigence-là ne vaut que pour les pannes du contrat serveur
 * (`unnamedProblem`, `problems.ts`), pas pour une décision qui nous appartient.
 */
function sessionLostDetail(entry: SessionLostEntry): string {
  switch (entry.reason.kind) {
    case 'missingToken':
      return 'Le jeton de session avait disparu du trousseau.';
    case 'serverRefusal': {
      const label = entry.reason.origin === 'refreshEndpoint' ? 'jeton de session' : 'jeton d’accès';
      const type = shortProblemType(entry.reason.type);
      return type === null
        ? `Le serveur a refusé le ${label} (${entry.reason.status}).`
        : `Le serveur a refusé le ${label} (${entry.reason.status} · ${type}).`;
    }
    case 'signedOut':
      return 'Déconnexion demandée depuis Réglages.';
  }
}

/** Le dernier segment d'un `type` de `ProblemDetails` — l'URI complète n'apporte rien de plus
 *  ici, et alourdit la ligne. */
function shortProblemType(type: string | null): string | null {
  if (type === null) {
    return null;
  }

  const segments = type.split('/');
  return segments[segments.length - 1] ?? type;
}

/** Un fait daté, et ce qu'il veut dire. Le tiret dit « jamais », pas « zéro ». */
function JournalLine({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | null;
  detail: string | null;
}) {
  return (
    <View style={styles.journalLine}>
      <View style={styles.journalHead}>
        <Text style={styles.journalLabel}>{label}</Text>
        <Text style={styles.journalValue}>{value ?? '—'}</Text>
      </View>
      {detail === null ? null : <Text style={styles.body}>{detail}</Text>}
    </View>
  );
}

/**
 * Les deux autorisations, et les gestes qui les rattrapent.
 *
 * Elle est en tête de l'écran parce que rien de ce qui suit n'a de sens sans elle : un
 * interrupteur de catégorie sur un appareil que le serveur ne peut plus joindre affiche une
 * préférence qui n'a aucun effet.
 */
function Authorizations({
  permission,
  onAsked,
}: {
  permission: NotificationPermission;
  /** Relire l'autorisation après une demande faite ici : la feuille système ne provoque pas
   *  toujours un passage par l'arrière-plan assez net pour que le hook s'en aperçoive seul. */
  onAsked: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const { access } = useHealthAccess();

  const ask = async () => {
    setAsking(true);
    // Le même chemin que l'onglet Guilde, pas un troisième : `requestPermissionAndRegister`
    // demande **puis** enregistre le jeton, et c'est cette seconde moitié qu'on perdrait à
    // appeler `requestPermissionsAsync` directement ici.
    await requestPermissionAndRegister();
    setAsking(false);
    onAsked();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Autorisations</Text>

      {/* ————— Notifications ————————————————————————————————————————————————————————— */}

      {permission === 'undetermined' ? (
        <>
          <Text style={styles.body}>
            GRRIND ne t&apos;a encore jamais demandé la permission d&apos;envoyer des
            notifications. Elles préviennent quand une séance est comptée et quand ta guilde
            bouge — et les réglages ci-dessous n&apos;ont d&apos;effet qu&apos;une fois
            l&apos;autorisation donnée.
          </Text>
          <Button
            label="Autoriser les notifications"
            onPress={() => void ask()}
            busy={asking}
            variant="quiet"
          />
        </>
      ) : null}

      {permission === 'denied' ? (
        <>
          <Text style={styles.body}>
            GRRIND n&apos;a pas la permission d&apos;envoyer de notifications sur cet appareil :
            les réglages ci-dessous n&apos;ont aucun effet tant que ça reste ainsi. iOS ne
            repose pas la question depuis l&apos;app — passe par Réglages système pour
            l&apos;autoriser.
          </Text>
          <Button
            label="Ouvrir Réglages"
            onPress={() => void Linking.openSettings()}
            variant="quiet"
          />
        </>
      ) : null}

      {/* `granted` ne propose rien : on ne demande pas de refaire ce qui est fait. Le dire
          quand même évite une section qui paraît vide à qui a tout accordé. */}
      {permission === 'granted' ? (
        <Text style={styles.body}>Les notifications sont autorisées.</Text>
      ) : null}

      {/* ————— Santé ——————————————————————————————————————————————————————————————————
          Jamais « refusé » : HealthKit ne le dit pas en lecture, et l'écrire serait inventer.
          Deux cas observables, deux gestes. */}

      {access.step === 'explain' ? (
        <>
          <Text style={styles.body}>
            GRRIND n&apos;a pas encore demandé l&apos;accès à Santé, d&apos;où viennent tes
            séances.
          </Text>
          {/* On n'ouvre **pas** la feuille système d'ici. Elle a une case par donnée et ne se
              rejoue jamais : il faut avoir dit avant ce qu'on lit et pourquoi, et c'est tout
              l'objet de l'onglet Santé. Ouvrir la feuille à froid depuis Réglages détruirait
              cette explication pour de bon. */}
          <Button
            label="Voir ce que GRRIND lit"
            onPress={() => router.navigate('/sante')}
            variant="quiet"
          />
        </>
      ) : null}

      {access.step === 'asked' ? (
        <>
          <Text style={styles.body}>
            L&apos;accès à Santé a été demandé. Si tes séances ne remontent pas, ses
            interrupteurs vivent ici :
          </Text>
          <Text style={styles.path}>
            Réglages › Confidentialité et sécurité › Santé › GRRIND
          </Text>
          <Button
            label="Ouvrir Réglages"
            onPress={() => void Linking.openSettings()}
            variant="quiet"
          />
        </>
      ) : null}

      {access.step === 'unavailable' ? (
        <Text style={styles.body}>
          Cet appareil ne donne pas accès aux données de santé.
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Une catégorie à la fois : `updateNotificationPreference` n'envoie jamais qu'une entrée dans
 * `notificationPreferences`, et le tableau ne porte que ce qui change — le contrat le dit.
 *
 * Aucun optimisme : l'interrupteur cède la place à un témoin pendant l'appel (`ToggleRow`,
 * prop `busy`) et se recale sur la réponse du serveur, jamais sur ce qu'on vient de demander.
 */
function Preferences({
  profile,
  onProfile,
}: {
  profile: UserProfile;
  onProfile: (profile: UserProfile) => void;
}) {
  const [busyCategory, setBusyCategory] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const categories = Object.keys(profile.notificationPreferences);

  const toggle = async (category: string, enabled: boolean) => {
    setBusyCategory(category);
    setFailure(null);

    const outcome = await updateNotificationPreference(category, enabled);

    if (outcome.ok) {
      onProfile(outcome.profile);
    } else {
      setFailure(outcome.failure);
    }

    setBusyCategory(null);
  };

  if (categories.length === 0) {
    // Le contrat ne le promet pas vide, mais un écran muet vaudrait moins qu'un mot.
    return (
      <View style={styles.card}>
        <Text style={styles.body}>Aucune catégorie de notification n&apos;est encore ouverte.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {categories.map((category) => (
        <ToggleRow
          key={category}
          label={notificationCategoryLabel[category as keyof typeof notificationCategoryLabel] ?? category}
          value={profile.notificationPreferences[category] ?? false}
          onValueChange={(next) => void toggle(category, next)}
          busy={busyCategory === category}
          disabled={busyCategory !== null && busyCategory !== category}
        />
      ))}

      {failure === null ? null : <Text style={styles.failure}>{messageFor(failure)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  centered: { paddingVertical: space.xl, alignItems: 'center' },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  /** Le compte ferme l'écran : de l'air au-dessus, pour qu'il ne colle pas aux catégories. */
  account: { marginTop: space.lg, gap: space.xs },
  cardTitle: { ...type.title, color: color.text },
  body: { ...type.body, color: color.textMuted },
  failure: { ...type.body, color: color.danger },
  /** Le chemin système, écrit en toutes lettres : il reste vrai quoi qu'ouvre le bouton —
   *  `openSettings()` mène à la page de GRRIND, les interrupteurs de Santé vivent ailleurs. */
  path: { ...type.body, color: color.text },
  journalLine: { gap: space.xs },
  /** Le fait à gauche, sa date à droite : on balaie la colonne des dates du regard. */
  journalHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  journalLabel: { ...type.label, color: color.textMuted, flexShrink: 1 },
  journalValue: { ...type.label, color: color.text },
});
