import type { Battle } from './timeline.ts';

/**
 * Le passe-plat entre le combat qu'on vient de livrer et l'écran qui le joue.
 *
 * ————— Pourquoi un passe-plat plutôt qu'un second appel ————————————————————————————————
 *
 * `POST /api/battles` rend la **timeline entière**, et c'est une décision du back
 * (younesdiouri/grrind-back#212) : « un seul aller-retour, rien à recharger avant de jouer
 * l'animation ». Rappeler `GET /api/battles/{id}` juste derrière défairait exactement ce que
 * cette décision achète.
 *
 * Il ne passe pas non plus par les paramètres de route : un combat peut compter quatre cents
 * événements, et une charge utile de cette taille ne traverse pas une URL.
 *
 * ————— Pourquoi ça ne survit pas à la mort de l'app, contrairement à `reward/pending.ts` ——
 *
 * C'est la différence qui compte, et elle n'est pas de la paresse. Une progression non jouée
 * est **perdue à jamais** si l'app meurt avant l'animation : l'XP a été créditée une fois, et
 * le serveur ne la reservira pas. D'où un magasin sur le disque, qui survit au processus.
 *
 * Un combat non regardé, lui, est dans l'historique — pour toujours, avec son identifiant, et
 * `GET /api/battles/{id}` le rejoue à l'identique. Il n'y a donc rien à sauver : l'app qui
 * meurt pendant l'animation laisse le joueur devant une liste où son combat est en tête.
 * Persister ici ajouterait un état à faire vieillir et à purger pour ne racheter que le
 * chargement qu'on vient de rendre inutile.
 */
let handedOver: Battle | null = null;

/** Dépose le combat qui vient d'être joué, à l'intention de l'écran d'animation. */
export function handOver(battle: Battle): void {
  handedOver = battle;
}

/**
 * Reprend le combat déposé, **s'il porte cet identifiant**.
 *
 * La vérification n'est pas de la prudence de principe : l'écran s'atteint aussi depuis
 * l'historique, sur n'importe quel identifiant, et rendre le dernier combat livré parce qu'il
 * traîne en mémoire ferait rejouer le mauvais — celui qu'on vient de voir, à la place de celui
 * qu'on a choisi.
 */
export function takeHandOver(id: string): Battle | null {
  if (handedOver === null || handedOver.id !== id) {
    return null;
  }

  const battle = handedOver;
  handedOver = null;
  return battle;
}

/** Oublier ce qui traîne — à la déconnexion, ou quand l'écran a fini de s'en servir. */
export function forgetHandOver(): void {
  handedOver = null;
}
