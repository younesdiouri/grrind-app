import type { Failure, ProblemType } from '@/features/auth/problems';

/**
 * Les deux règles de la clé d'idempotence d'un combat, **sans une ligne d'Expo**.
 *
 * Elles vivent ici et pas dans `battleKey.ts` pour la même raison que `fingerprintOf` vit dans
 * `batchKey.ts` et non dans `keyStore.ts` : ce sont des règles, et une règle se prouve sous
 * `node --test` en quelques millisecondes. Un trousseau sécurisé, non.
 *
 * Et ce sont les règles qu'il faut prouver. Leur échec ne se voit **pas** à l'œil : les deux
 * issues affichent une animation, et la mauvaise ne se manifeste qu'à l'ouverture suivante de
 * l'historique, où deux combats attendent au lieu d'un.
 */

/**
 * L'intention, sous forme d'empreinte.
 *
 * Un lot de séances change entre deux tentatives ; une intention de combat, non. Elle est donc
 * la chose la plus simple possible — l'adversaire choisi, ou son absence — et les deux cas
 * qu'elle produit sont exactement les deux qu'on veut :
 *
 * - **Même adversaire, aucun verdict entre les deux** : c'est un rejeu, la clé repart à
 *   l'identique et le serveur ressort le combat d'origine.
 * - **Un autre adversaire** : autre intention, clé neuve, autre combat. C'est ce qu'un joueur
 *   qui change d'avis demande.
 *
 * `auto` et non la chaîne vide pour l'absence de choix : une empreinte vide se confondrait avec
 * un enregistrement tronqué, et les deux ne veulent pas dire la même chose. Le préfixe `enemy:`
 * rend par ailleurs impossible qu'une clé d'adversaire s'appelle un jour `auto` sans qu'on le
 * remarque.
 */
export function intentionOf(enemyKey: string | null): string {
  return enemyKey === null ? 'auto' : `enemy:${enemyKey}`;
}

/**
 * Les refus qui **prouvent qu'aucun combat n'a été écrit**.
 *
 * La liste est courte exprès. Le ticket back (#219) est explicite : un joueur sous le niveau
 * minimum reçoit un 422 et *aucune ligne n'est écrite* ; une clé inconnue non plus.
 */
const PROVES_NOTHING_WRITTEN: ReadonlySet<ProblemType> = new Set<ProblemType>([
  'https://grrind.app/problems/enemy-key-unknown',
  'https://grrind.app/problems/enemy-level-too-low',
]);

/**
 * Faut-il effacer la clé après ce refus ?
 *
 * ————— La règle est renversée par rapport à l'intuition, et c'est le point ————————————————
 *
 * La formulation évidente serait « on oublie la clé dès qu'un verdict tombe, succès ou refus
 * nommé ». Elle est fausse sur deux cas, et les deux coûtent un combat en double :
 *
 * - un **500** ne dit pas si le combat a été écrit — la panne peut être survenue avant comme
 *   après l'écriture, et rien dans la réponse ne permet de trancher ;
 * - un **409 `idempotency-key-in-flight`** dit exactement le contraire d'un verdict : la
 *   requête d'origine court encore.
 *
 * La règle retenue est donc l'inverse : **on garde la clé sauf si le refus prouve qu'aucun
 * combat n'a été écrit.** Garder est sans danger — l'intention n'ayant pas changé, le corps est
 * le même, donc rejouer la clé est un rejeu légitime : le serveur ressort le combat s'il
 * existe, le joue une fois s'il n'existe pas. Effacer trop tôt, en revanche, est irréversible :
 * la tentative suivante frappe une clé neuve et le tirage repart.
 *
 * Un refus **non nommé** — hors ligne, corps illisible, passerelle en 502 — garde donc la clé
 * lui aussi. C'est le cas que tout le mécanisme existe pour couvrir.
 */
export function forgetsKeyAfter(failure: Failure): boolean {
  return failure.kind === 'problem' && PROVES_NOTHING_WRITTEN.has(failure.problem.type);
}
