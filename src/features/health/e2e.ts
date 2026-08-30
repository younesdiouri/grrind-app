/**
 * Le commutateur du harnais E2E (#122) — et rien d'autre.
 *
 * ————— Pourquoi une constante et pas un réglage ————————————————————————————————————————
 *
 * `EXPO_PUBLIC_E2E` est lue au *bundling*, pas à l'exécution : Babel remplace l'expression par
 * la chaîne littérale, et `isE2eBuild` devient un `false` constant dans tout bundle qui n'a pas
 * été construit par `scripts/e2e-ios.sh`. Les branches qui en dépendent disparaissent au lieu
 * de rester là à attendre qu'on les allume — un bundle de production n'embarque ni le
 * fournisseur bouchon, ni le moyen de le choisir.
 *
 * Le variant a son propre identifiant (`app.grrind.e2e`) et son propre schéma : la variante E2E
 * ne peut pas être installée par-dessus l'app de dev, ni ouvrir ses liens.
 *
 * ————— Pourquoi le scénario se lit sur l'adresse e-mail ————————————————————————————————
 *
 * Il faut un canal pour dire au bouchon ce qu'il doit rendre, et l'app n'en a qu'un seul que le
 * pilote E2E traverse déjà de bout en bout : le formulaire de connexion. Un lien profond
 * imposerait une route de test dans le routeur, un argument de lancement imposerait un module
 * natif — les deux ajouteraient à l'app de production une porte que ce fichier lui évite.
 *
 * La convention tient en une ligne : une adresse qui contient `-empty-` ouvre une session sans
 * la moindre séance, toutes les autres en ouvrent une avec quatre. Elle est portée par
 * `.maestro/login.yaml`, qui la commente aussi.
 */
export type E2eHealthScenario = 'empty' | 'multiple';

export const isE2eBuild = process.env.EXPO_PUBLIC_E2E === '1';

let scenario: E2eHealthScenario = 'multiple';

export function setE2eHealthScenario(value: string | string[] | undefined): void {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === 'empty' || candidate === 'multiple') {
    scenario = candidate;
  }
}

export function getE2eHealthScenario(): E2eHealthScenario {
  return scenario;
}
