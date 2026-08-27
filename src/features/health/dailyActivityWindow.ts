import type { DailyActivityData } from '@/features/health/provider';

/**
 * La fenêtre de journées, et les deux bornes du contrat.
 *
 * Fichier séparé de `dailyActivity.ts`, et pour la même raison que `retryPolicy.ts` l'est de
 * `sync.ts` : ces règles se prouvent sous `node --test`, sans appareil et sans client HTTP.
 * L'envoi, lui, importe le client généré — donc `expo-constants`, donc quelque chose que Node
 * ne sait pas charger.
 */

/**
 * Combien de journées on lit et on envoie.
 *
 * La fenêtre du serveur est de **sept** jours. En envoyer dix ne coûte rien — le contrat en
 * accepte quatre-vingt-dix — et couvre une app restée fermée une semaine, ce qui est un cas
 * ordinaire chez quelqu'un qui part sans son téléphone d'entraînement.
 *
 * Ce n'est pas un réglage de jeu : la valeur qui compte, la largeur de la fenêtre, vit côté
 * serveur et se corrige sans republier le client. Celle-ci ne fait que la couvrir largement.
 */
export const WINDOW_DAYS = 10;

/** Le maximum que le contrat accepte dans un lot. */
const MAX_DAYS = 90;

/**
 * Le lot à envoyer, ou `null` s'il n'y a rien à envoyer.
 *
 * Deux bornes du contrat, et **aucune des deux ne se voit en développement** : `minItems: 1`
 * ferait rejeter un lot vide en 422, `maxItems: 90` une fenêtre trop large. Le premier cas
 * arrive dès qu'un appareil n'a aucune donnée d'énergie — un iPhone jamais porté, un
 * simulateur — et il arriverait **en silence**, l'envoi étant un meilleur effort qui n'affiche
 * rien.
 */
export function batchOfDays(entries: DailyActivityData[]): DailyActivityData[] | null {
  if (entries.length === 0) {
    return null;
  }

  // Les plus **récentes** si jamais on en avait trop : la fenêtre du serveur est glissante et
  // regarde vers aujourd'hui, donc ce sont les vieilles journées qui ne servent plus.
  return entries.slice(-MAX_DAYS);
}
