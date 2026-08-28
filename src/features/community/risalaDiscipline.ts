import type { components } from '@/api/schema';
import { disciplineLabel } from '@/design/tokens';

/**
 * Le nom d'une discipline de Risāla — reçue en `string` brute, jamais en `Discipline` typée.
 *
 * Le contrat n'a pas encore rattrapé sa propre dérive (younesdiouri/grrind-back#201) :
 * `Risala.discipline` et `RisalaTurn.discipline`/`choosable` sont tapés `string` au lieu de
 * l'enum qu'ils portent réellement. En attendant que le back corrige, **un seul repli**, ici,
 * plutôt que dispersé dans `RisalaCard` et l'état du tour : une clé encore inconnue du client
 * (le back en ouvre une avant que le client régénère ses types) s'affiche telle quelle, plutôt
 * que de faire planter un accès de tableau qui la manque.
 */
export function risalaDisciplineLabel(discipline: string): string {
  return discipline in disciplineLabel
    ? disciplineLabel[discipline as components['schemas']['Discipline']]
    : discipline;
}
