import { disciplineLabel } from '@/design/tokens';
import { formatDuration } from '@/features/progression/format';
import type { SyncSummary } from '@/features/reward/timeline';

/**
 * Ce que dit la notification quand une séance est comptée **en arrière-plan**.
 *
 * ————— Pourquoi elle existe ————————————————————————————————————————————————————————————
 *
 * Le réveil HealthKit (#55) n'a personne devant l'écran : son résumé va se mettre en file et
 * attend la prochaine ouverture pour se jouer. C'est la bonne décision — une progression ne
 * se joue jamais dans le vide — mais elle laisse un trou. Entre la fin de la séance et
 * l'ouverture de l'app, il ne se passe **rien d'observable**, et on ne sait pas si la chaîne
 * a marché.
 *
 * Cette notification ferme le trou par le seul bout qui intéresse le joueur : ce qu'il a
 * gagné. Elle ne remplace pas la mise en scène — le résumé attend toujours en file, et taper
 * la notification ouvre simplement l'app, où le portillon de lancement le joue.
 *
 * ————— Pure, et testée comme telle ——————————————————————————————————————————————————
 *
 * Le texte se décide ici, l'envoi ailleurs (`backgroundWakeup.ios.ts`). Une notification
 * fausse est un défaut qu'on ne peut pas reproduire à la demande : elle demande une vraie
 * séance, une vraie montre et un vrai réveil système. Elle doit donc se prouver sur les
 * fixtures, comme la timeline.
 *
 * ————— Ce qu'elle ne dit jamais ——————————————————————————————————————————————————————
 *
 * **« +0 XP ».** Une séance peut être créditée sans rapporter d'expérience — la marche
 * n'alimente que Vitality (`grrind-back#167`). Annoncer un zéro ferait passer une règle du
 * jeu pour une panne. Elle dit alors que la séance est enregistrée, et s'arrête là.
 *
 * **Rien du tout quand rien n'a été crédité.** Un import où tout était déjà compté est le cas
 * nominal ; le notifier transformerait le fonctionnement normal en événement.
 *
 * **Jamais un échec.** Un import qui n'aboutit pas en arrière-plan se rattrapera tout seul au
 * prochain réveil ou à la prochaine ouverture, avec la même clé d'idempotence. Le raconter
 * serait inquiéter pour rien — c'est le journal (`journal.ts`) qui porte ça, et il se consulte
 * plutôt qu'il n'interrompt.
 */
export type CreditedNotice = { title: string; body: string };

export function creditedNotice(summary: SyncSummary): CreditedNotice | null {
  const credited = summary.imported;

  if (credited.length === 0) {
    return null;
  }

  const awarded = summary.totals?.xpAwarded ?? 0;
  // `totals` est le raccourci que le serveur sert pour ça. Le repli sur `credited.length`
  // couvre le cas où il manquerait : mieux vaut un compte juste sans niveau qu'aucun message.
  const count = summary.totals?.workoutCount ?? credited.length;
  const climbed =
    summary.totals !== null &&
    summary.totals !== undefined &&
    summary.totals.levelAfter > summary.totals.levelBefore;

  const level = climbed ? ` Niveau ${summary.totals?.levelAfter} !` : '';

  if (count === 1) {
    const only = credited[0];
    const what = `Ta séance de ${disciplineLabel[only.session.discipline].toLowerCase()} (${formatDuration(only.session.durationSeconds)})`;

    return {
      title: 'Séance comptée',
      body:
        awarded > 0
          ? `${what} t’a rapporté ${awarded} XP.${level}`
          : `${what} est enregistrée.`,
    };
  }

  return {
    title: `${count} séances comptées`,
    body: awarded > 0 ? `+${awarded} XP au total.${level}` : 'Elles sont enregistrées.',
  };
}
