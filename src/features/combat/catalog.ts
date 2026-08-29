import type { components } from '@/api/schema';

export type Enemy = components['schemas']['Enemy'];

/**
 * Une entrée du catalogue, avec la seule chose que le client ajoute : est-elle accessible.
 *
 * `locked` n'est pas une donnée du serveur, c'est une comparaison — et c'est la seule que ce
 * module fait. Elle est ici plutôt que dans l'écran pour la même raison que partout ailleurs
 * dans ce dépôt : une règle qui se teste sans monter un composant se teste vraiment.
 */
export type CatalogEntry = { enemy: Enemy; locked: boolean };

/**
 * Le catalogue, dans **l'ordre servi**, chaque entrée sachant si le joueur peut l'affronter.
 *
 * ————— Ce qu'on ne fait pas, et pourquoi c'est le cœur de ce fichier ————————————————————
 *
 * **Aucun tri.** Le contrat promet « ennemis ordinaires puis boss, dans l'ordre de déclaration
 * de chaque liste ». Retrier par niveau, ou remonter les accessibles au-dessus des
 * verrouillés, écraserait la seule information de structure que le serveur donne.
 *
 * **Aucune distinction boss / ennemi ordinaire.** `Enemy` a exactement la même forme pour les
 * deux, et un ordre n'est pas un champ : rien dans la charge utile ne dit où la première liste
 * s'arrête. Il existe une heuristique tentante — deux entrées partagent `minimumLevel: 10`,
 * or `enemies:` interdit les doublons de palier côté serveur, donc la seconde serait un boss.
 * Elle est **interdite** : c'est une règle de jeu déduite d'un invariant de configuration
 * qu'on ne contrôle pas, et elle deviendra fausse au premier catalogue qui s'étoffe. Si la
 * distinction doit exister, elle s'ajoute au contrat côté back.
 *
 * **Aucun filtrage.** Un adversaire hors de portée reste **visible** : c'est ce qui donne une
 * raison de monter de niveau. Le cacher rendrait le catalogue d'un joueur de niveau 1
 * indiscernable d'un catalogue vide.
 */
export function catalogFor(enemies: Enemy[], playerLevel: number): CatalogEntry[] {
  return enemies.map((enemy) => ({
    enemy,
    // Strictement supérieur : `minimumLevel` est le niveau **requis**, donc l'atteindre suffit.
    // Le serveur tranche de la même façon — un joueur de niveau 19 se voit refuser un
    // adversaire de niveau 20, pas un de niveau 19.
    locked: enemy.minimumLevel > playerLevel,
  }));
}
