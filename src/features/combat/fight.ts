import { api } from '@/api/client';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import { battleKeys } from './battleKey.ts';
import { forgetsKeyAfter, intentionOf } from './keyPolicy.ts';
import { noteBattleFought } from './battlesRevision.ts';
import { handOver } from './lastBattle.ts';
import type { Battle } from './timeline.ts';

export type FightOutcome =
  | { kind: 'fought'; battle: Battle }
  | { kind: 'refused'; failure: Failure };

/**
 * Livre un combat.
 *
 * La règle de la clé — quand elle survit, quand elle s'efface — vit dans `keyPolicy.ts` et s'y
 * prouve. Ce fichier l'applique, il ne la décide pas.
 *
 * ————— Ce que le succès enchaîne ————————————————————————————————————————————————————————
 *
 * Le combat est mis en main (`handOver`) plutôt que rechargé : le back rend la timeline entière
 * sur le `POST` précisément pour qu'il n'y ait qu'un aller-retour. Et l'historique est prévenu
 * **ici**, au verdict, et non à la sortie de l'animation — un joueur qui tue l'app pendant la
 * séquence doit retrouver son combat en tête de liste.
 */
export async function fight(enemyKey: string | null): Promise<FightOutcome> {
  const intention = intentionOf(enemyKey);

  // La clé est frappée **une fois par intention**, avant l'envoi, et persistée. Une clé neuve
  // par tentative annulerait tout le mécanisme — c'est l'invariant n°2 du client.
  const key = await battleKeys.keyFor(intention);

  // `.catch` plutôt qu'un `try` autour du bloc entier : seul l'appel réseau doit pouvoir
  // rendre `OFFLINE`. Un `try` plus large avalerait aussi une panne d'écriture du trousseau et
  // la déguiserait en absence de connexion — deux causes qui n'appellent pas la même suite.
  const reply = await api
    .POST('/api/battles', {
      params: { header: { 'Idempotency-Key': key } },
      body: enemyKey === null ? {} : { enemy: enemyKey },
    })
    .catch(() => null);

  if (reply === null) {
    // Le réseau n'a jamais répondu : aucun verdict, la clé **reste** en place. C'est
    // exactement la fenêtre que tout ce mécanisme existe pour fermer.
    return { kind: 'refused', failure: OFFLINE };
  }

  if (reply.data !== undefined) {
    await battleKeys.forget();
    handOver(reply.data);
    noteBattleFought();

    return { kind: 'fought', battle: reply.data };
  }

  const failure = failureFrom(reply.error);

  if (forgetsKeyAfter(failure)) {
    await battleKeys.forget();
  }

  return { kind: 'refused', failure };
}
