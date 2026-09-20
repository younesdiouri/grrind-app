import { api } from '@/api/client';
import { failureFrom, OFFLINE, type Failure } from '@/features/auth/problems';
import { battleKeys } from './battleKey.ts';
import { duelIntentionOf, forgetsKeyAfter, intentionOf } from './keyPolicy.ts';
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
  return deliver(intentionOf(enemyKey), (key) =>
    api.POST('/api/battles', {
      params: { header: { 'Idempotency-Key': key } },
      body: enemyKey === null ? {} : { enemy: enemyKey },
    }),
  );
}

/**
 * Défie un co-équipier (younesdiouri/grrind-back#283).
 *
 * `POST /api/players/{id}/battles` rend **exactement** la charge utile de `POST /api/battles`,
 * timeline comprise : tout ce qui suit le verdict est donc le même geste, jusqu'à la mise en
 * main. C'est ce que la route achète, et c'est pour ça qu'il n'y a ici ni second type, ni
 * second écran, ni seconde animation — seulement un autre appel et une autre intention.
 *
 * Le refus d'un adversaire qui n'est pas un co-équipier est un **404**, jamais un 403 : le
 * serveur ne confirme pas qu'un compte porte cet UUID. Le client n'a rien à en déduire de plus
 * que ce que `messageFor` en dit.
 */
export async function challenge(playerId: string): Promise<FightOutcome> {
  return deliver(duelIntentionOf(playerId), (key) =>
    api.POST('/api/players/{id}/battles', {
      params: { header: { 'Idempotency-Key': key }, path: { id: playerId } },
    }),
  );
}

/**
 * Ce que les deux portes partagent : la clé, le verdict, et ce que le succès enchaîne.
 *
 * Écrit une fois plutôt que deux — ce n'est pas de l'économie de lignes, c'est que la règle de
 * la clé est la seule chose du client dont l'échec ne se voit pas à l'œil (voir `keyPolicy.ts`)
 * et qu'une copie divergerait à la première correction.
 */
async function deliver(
  intention: string,
  send: (key: string) => Promise<{ data?: Battle; error?: unknown }>,
): Promise<FightOutcome> {
  // La clé est frappée **une fois par intention**, avant l'envoi, et persistée. Une clé neuve
  // par tentative annulerait tout le mécanisme — c'est l'invariant n°2 du client.
  const key = await battleKeys.keyFor(intention);

  // `.catch` plutôt qu'un `try` autour du bloc entier : seul l'appel réseau doit pouvoir
  // rendre `OFFLINE`. Un `try` plus large avalerait aussi une panne d'écriture du trousseau et
  // la déguiserait en absence de connexion — deux causes qui n'appellent pas la même suite.
  const reply = await send(key).catch(() => null);

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
