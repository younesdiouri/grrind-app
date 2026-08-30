import * as Notifications from 'expo-notifications';

import GrrindHealth from '@/../modules/grrind-health/src/GrrindHealthModule';

import { shouldCommitAnchor } from '@/features/health/anchorPolicy';
import { creditedNotice } from '@/features/health/creditedNotice';
import { isE2eBuild } from '@/features/health/e2e';
import { noteRegistration, noteWake } from '@/features/health/journal';
import { sync } from '@/features/health/sync';

/**
 * Le réveil HealthKit, câblé jusqu'au réseau. La seule capacité qui ne passe pas par le port
 * `HealthProvider` — voir le docblock en tête de `GrrindHealthModule.swift`, qui l'explique et
 * ne le regrettera pas avant que #15 donne un équivalent Android.
 *
 * Comme `current.ios.ts`, ce fichier n'existe que sur iPhone : la sélection passe par
 * l'extension Metro, pas par un `if (Platform.OS === 'ios')` qui laisserait quand même
 * `requireNativeModule('GrrindHealth')` s'exécuter — et jeter — sur une plateforme où le
 * module natif n'est pas lié.
 */

/**
 * Inscrit l'app auprès d'iOS pour être réveillée. Idempotent côté natif, donc rappelable sans
 * risque à chaque lancement — voir `GrrindHealthModule.enableBackgroundDelivery`.
 *
 * Échoue tant que HealthKit n'a rien accordé, et c'est attendu : l'appelant ne le tente qu'une
 * fois l'autorisation demandée (`useHealthAccess.ts`, `useSync.ts`). L'échec est avalé plutôt
 * que remonté — ce n'est jamais l'utilisateur qui a quelque chose à faire de ce ratage, et le
 * prochain appel, au prochain lancement, retentera de lui-même.
 */
export async function enableBackgroundWakeup(): Promise<void> {
  if (isE2eBuild) {
    return;
  }

  try {
    await GrrindHealth.enableBackgroundDelivery();
    noteRegistration(true);
  } catch {
    // Voir le docblock : dégradation silencieuse, pas panne à afficher. Elle laisse en
    // revanche une trace depuis le #82 — « l'inscription au réveil a échoué » est
    // exactement ce qu'on cherche à savoir quand plus rien ne remonte, et l'avaler
    // *complètement* rendait les deux causes indiscernables.
    noteRegistration(false);
  }
}

/**
 * Écoute le réveil, du premier événement natif jusqu'à l'ancre commise.
 *
 * Rend une fonction de désinscription plutôt qu'un module qui s'auto-abonne pour toujours :
 * `useSync.ts` la monte et la démonte avec l'état de connexion, comme les trois autres
 * déclencheurs.
 */
export function startBackgroundWakeup(): () => void {
  if (isE2eBuild) {
    return () => undefined;
  }

  const subscription = GrrindHealth.addListener('onWorkoutsChanged', (event) => {
    void handleWakeup(event.anchor);
  });

  return () => subscription.remove();
}

/**
 * Un réveil, du premier événement natif jusqu'à l'ancre commise — ou pas.
 *
 * Emprunte exactement le chemin des trois autres déclencheurs (`sync('background')`), et
 * s'arrête là : aucune mise en scène ne part d'ici, voir le docblock de `sync.ts`. Ce qui suit
 * ne décide qu'une chose, faut-il faire avancer l'ancre — voir `anchorPolicy.ts` pour la règle,
 * et `GrrindHealthModule.commitAnchor` pour ce qu'elle protège.
 */
async function handleWakeup(anchor: string): Promise<void> {
  // Noté **avant** l'import, et pas après : le réveil a bien eu lieu même si ce qui suit
  // échoue. C'est précisément la distinction que le journal existe pour rendre — un réveil
  // récent avec une synchronisation ancienne accuse le réseau ou le serveur endormi ; pas de
  // réveil du tout accuse l'inscription.
  noteWake();

  const outcome = await sync('background');

  // `throttled` : une autre synchronisation vient de répondre, à moins de trente secondes.
  // Rien n'est parti pour ce réveil précis, donc rien n'est tranché sur *cette* différence —
  // le prochain réveil la retrouvera, et elle se sera peut-être déjà réglée d'elle-même.
  if (outcome.status === 'throttled') {
    return;
  }

  // La séance est comptée : personne n'est devant l'écran, donc on le dit (#82). Le résumé
  // reste en file et se jouera à l'ouverture — cette notification ne le consomme pas, elle
  // signale seulement qu'il y a quelque chose à venir voir.
  if (outcome.result.kind === 'summary') {
    await announce(outcome.result.summary);
  }

  if (!shouldCommitAnchor(outcome.result)) {
    return;
  }

  try {
    await GrrindHealth.commitAnchor(anchor);
  } catch {
    // Une ancre illisible ou une écriture qui échoue : rien à faire ici, personne ne regarde.
    // Ne pas avancer laisse relire la même différence au prochain réveil — sans conséquence,
    // voir `anchorPolicy.ts`.
  }
}

/**
 * Poste la notification, si elle a quelque chose à dire et si le système l'autorise.
 *
 * On ne **demande** rien depuis un réveil en arrière-plan : une feuille système qui
 * apparaîtrait sans que l'app soit ouverte est le meilleur moyen de récolter un refus
 * définitif, et iOS ne repose jamais la question. Le geste vit dans Réglages (#81).
 *
 * Le texte, lui, se décide dans `creditedNotice.ts`, où il se prouve sur les fixtures : une
 * notification fausse demanderait une vraie séance et un vrai réveil pour se reproduire.
 */
async function announce(summary: Parameters<typeof creditedNotice>[0]): Promise<void> {
  const notice = creditedNotice(summary);

  if (notice === null) {
    return;
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: { title: notice.title, body: notice.body },
      // `null` : tout de suite. Il n'y a rien à planifier — la séance vient d'être comptée.
      trigger: null,
    });
  } catch {
    // Une notification qui ne part pas ne doit jamais faire échouer l'import qu'elle
    // accompagne, ni empêcher l'ancre d'avancer. C'est un bonus, pas une étape.
  }
}
