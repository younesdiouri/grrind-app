import { outcomeUnknown } from '@/features/health/replay';
import type { SyncResult } from '@/features/health/sync';

/**
 * L'ancre HealthKit doit-elle avancer après ce verdict de synchronisation ?
 *
 * Elle appartient au réveil (`backgroundWakeup.ios.ts`), pas aux trois autres déclencheurs, qui
 * n'en portent pas — voir `GrrindHealthModule.commitAnchor` (`modules/grrind-health/src/…`),
 * dont le docblock pose déjà la règle : à n'appeler **qu'après que le serveur a répondu**.
 *
 * ————— Ce qui compte comme « répondu » —————————————————————————————————————————————————
 *
 * **Pas seulement un import réussi.** Le natif compte comme « du neuf » tout ce qui a changé
 * depuis l'ancre, `added` comme `deleted` — il ne décide jamais ce qui vaut la peine, il rend
 * ce que HealthKit lui donne. Une séance **effacée** dans Santé déclenche donc le réveil sans
 * qu'il y ait jamais rien à importer : `nothingToSend` est le verdict normal de ce cas, et
 * c'est une réponse tout autant qu'un import réussi — la synchronisation entière a tourné, le
 * serveur a été interrogé (`GET /api/workouts/sync-state`), personne ne s'est tu.
 *
 * Un refus **définitif** compte aussi : corps invalide, clé réutilisée, jeton mort. Le serveur
 * a tranché, rejouer ne changerait rien.
 *
 * Ce qui ne compte pas, c'est l'issue **inconnue** : réseau coupé, 500, panne d'idempotence en
 * cours, notre propre abandon (`budgetExceeded`, #140) ou chien de garde natif (25 s) expiré
 * avant qu'on sache. Ne pas commettre dans ce cas fait relire la même différence au prochain
 * réveil — sans conséquence, puisque rien n'a bougé côté serveur, alors que commettre à tort
 * ferait perdre une séance pour de bon : l'ancre ne recule jamais.
 *
 * `outcomeUnknown()` porte déjà exactement ce partage côté rejeu (`replay.ts`) pour les refus
 * du serveur ; `budgetExceeded` n'en passe même pas par là — c'est un abandon **de notre
 * fait**, avant tout refus, et il se range du même côté pour la même raison.
 */
export function shouldCommitAnchor(result: SyncResult): boolean {
  switch (result.kind) {
    case 'summary':
    case 'nothingToSend':
      return true;

    // Pas de fournisseur de santé : le réveil qui a mené ici n'a rien pu vérifier. Prudence —
    // ne pas commettre plutôt que de risquer d'avancer sur une différence jamais lue. En
    // pratique le réveil n'existe que parce que HealthKit a répondu, donc ce cas ne se
    // rencontre pas ici.
    case 'unavailable':
      return false;

    // Notre budget (`retryPolicy.ts`, #140) a expiré avant qu'un verdict ne tombe : le
    // serveur a peut-être déjà tout crédité, on ne le sait tout simplement pas. Même
    // traitement qu'une panne de transport.
    case 'budgetExceeded':
      return false;

    case 'failed':
      return !outcomeUnknown(result.failure.kind === 'problem' ? result.failure.problem : null);
  }
}
