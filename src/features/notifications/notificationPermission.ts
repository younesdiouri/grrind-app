import type { PermissionStatus } from 'expo-notifications';

/**
 * L'autorisation système, en **trois** états — et la table qui les lit.
 *
 * ————— Le défaut que ce fichier existe pour fermer (#81) ————————————————————————————————
 *
 * `useNotificationPermission` ne lisait que le booléen `granted` et repliait tout le reste sur
 * `'denied'`. Or `getPermissionsAsync()` rend **trois** valeurs, et la troisième —
 * `undetermined`, « la question n'a jamais été posée » — n'est pas un refus.
 *
 * La confusion coûtait un cul-de-sac complet : l'app annonçait « les notifications sont
 * désactivées » à un joueur qu'on n'avait jamais interrogé, et le renvoyait vers Réglages
 * système où **il n'y a pas d'interrupteur** — iOS n'affiche la section « Notifications » d'une
 * app qu'une fois qu'elle a demandé au moins une fois. Le seul chemin proposé ne menait nulle
 * part.
 *
 * ————— Pourquoi une table plutôt qu'une affectation ——————————————————————————————————————
 *
 * `PermissionStatus` est une énumération de chaînes : ses membres ne sont pas assignables à une
 * union de littéraux, et il faut donc traduire. C'est une contrainte du typage, et c'est aussi
 * le garde-fou qu'on veut — même raison que `xpSourceLabel` et `disciplineLabel` : la clé du
 * `Record` sort du type d'`expo-notifications`, jamais d'une union recopiée, et le compilateur
 * cassera le jour où une quatrième valeur apparaît au lieu de la laisser tomber dans un `else`.
 *
 * L'import est **de type seulement**, et ça compte : ce module se prouve sous `node --test`,
 * qui ne peut pas charger `expo-notifications`. Même règle que `deviceEnvironment.ts`.
 */
export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

const table: Record<PermissionStatus, NotificationPermission> = {
  granted: 'granted',
  denied: 'denied',
  undetermined: 'undetermined',
};

export function notificationPermissionFrom(status: PermissionStatus): NotificationPermission {
  return table[status];
}
