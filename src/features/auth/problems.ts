import type { components } from '@/api/schema';

/**
 * Les pannes de l'API, traduites.
 *
 * Les erreurs sont en `application/problem+json` (RFC 9457) et le membre `type` est
 * l'identifiant **stable** de la panne. C'est dessus que les messages se branchent, jamais sur
 * le code HTTP : un 409 peut être une adresse déjà prise ou une séance déjà en cours, et ces
 * deux-là n'appellent pas la même phrase.
 *
 * Le `switch` est exhaustif **par construction** : son `default` passe le `type` à une
 * fonction qui n'accepte que `never`. Le jour où le back ajoute une panne au contrat, le
 * client ne compile plus — c'est le seul moment où on peut encore corriger le tir sans qu'un
 * utilisateur voie un écran muet.
 */

export type ProblemDetails = components['schemas']['ProblemDetails'];
export type ProblemType = ProblemDetails['type'];
export type Violation = { field: string; message: string };

/** Un appel qui a échoué : soit le serveur a nommé la panne, soit il n'a pas répondu. */
export type Failure =
  | { kind: 'problem'; problem: ProblemDetails; status: number }
  | { kind: 'offline' };

export const OFFLINE: Failure = { kind: 'offline' };

/**
 * Reconnaît un `ProblemDetails` dans ce que rend `openapi-fetch`.
 *
 * Le typage du client dit déjà ce que *devrait* rendre chaque route. Cette garde-là existe
 * pour l'autre cas : un proxy qui renvoie du HTML, un 502 de la passerelle, un back d'une
 * version plus récente. On ne fait pas confiance à la forme sans l'avoir regardée.
 */
export function asProblem(error: unknown): ProblemDetails | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const candidate = error as Partial<Record<keyof ProblemDetails, unknown>>;
  if (typeof candidate.type !== 'string' || typeof candidate.detail !== 'string') {
    return null;
  }

  return error as ProblemDetails;
}

export function failureFrom(error: unknown, status: number): Failure {
  const problem = asProblem(error);
  return problem === null ? OFFLINE : { kind: 'problem', problem, status };
}

/**
 * Les violations d'un 422, indexées par champ.
 *
 * `ValidationProblem` ajoute `violations` à `ProblemDetails` ; chaque violation nomme son
 * champ, ce qui permet d'accrocher le message **sous l'entrée fautive** plutôt que de jeter
 * un bandeau générique en haut du formulaire.
 */
export function violationsByField(failure: Failure): Partial<Record<string, string>> {
  if (failure.kind !== 'problem') {
    return {};
  }

  const raw = (failure.problem as { violations?: unknown }).violations;
  if (!Array.isArray(raw)) {
    return {};
  }

  const byField: Partial<Record<string, string>> = {};
  for (const entry of raw as Violation[]) {
    if (typeof entry?.field === 'string' && typeof entry?.message === 'string') {
      byField[entry.field] ??= entry.message;
    }
  }

  return byField;
}

export function messageFor(failure: Failure): string {
  if (failure.kind === 'offline') {
    return 'Impossible de joindre GRRIND. Vérifie ta connexion.';
  }

  return messageForProblem(failure.problem);
}

function messageForProblem(problem: ProblemDetails): string {
  switch (problem.type) {
    case 'https://grrind.app/problems/validation-failed':
      return 'Certaines informations sont refusées.';

    case 'https://grrind.app/problems/internal-error':
      return 'GRRIND a un problème de son côté. Réessaie dans un instant.';

    // Les trois pannes d'idempotence sont des bugs du client, pas des situations de jeu :
    // une clé absente ou réutilisée sur une autre requête veut dire que l'app a mal ouvert
    // sa séance. On ne les explique pas, on invite à recommencer.
    case 'https://grrind.app/problems/idempotency-key-required':
    case 'https://grrind.app/problems/idempotency-key-reused':
      return "L'app a envoyé une requête incohérente. Recommence l'action.";

    case 'https://grrind.app/problems/idempotency-key-in-flight':
      return 'Cette action est déjà en cours. Laisse-lui une seconde.';

    case 'https://grrind.app/problems/email-already-used':
      return 'Cette adresse a déjà un compte. Connecte-toi.';

    case 'https://grrind.app/problems/email-belongs-to-another-account':
      return "Cette adresse appartient déjà à un compte GRRIND. Connecte-toi avec ton mot de passe, puis rattache ce fournisseur.";

    case 'https://grrind.app/problems/invalid-refresh-token':
      return 'Ta session a expiré. Reconnecte-toi.';

    case 'https://grrind.app/problems/social-sign-in-rejected':
      return "Le fournisseur a refusé la connexion. Réessaie.";

    case 'https://grrind.app/problems/social-profile-incomplete':
      return "Le fournisseur n'a pas transmis assez d'informations pour ouvrir un compte.";

    case 'https://grrind.app/problems/session-not-found':
      return "Cette séance n'existe pas.";

    case 'https://grrind.app/problems/session-not-active':
      return "Cette séance n'est plus en cours.";

    case 'https://grrind.app/problems/session-already-active':
      return 'Une séance est déjà en cours.';

    case 'https://grrind.app/problems/session-too-short':
      return 'Cette séance est trop courte pour compter.';

    case 'https://grrind.app/problems/session-cooldown':
      return 'Encore un peu de repos avant la prochaine séance.';

    case 'https://grrind.app/problems/title-unknown':
      return "Ce titre n'existe pas.";

    case 'https://grrind.app/problems/title-not-unlocked':
      return "Ce titre n'est pas encore débloqué.";

    default:
      return unnamedProblem(problem.type);
  }
}

/**
 * Le repli sur une panne que ce client ne connaît pas.
 *
 * Le paramètre est typé `never` : à la compilation, il ne peut recevoir que l'ensemble vide,
 * donc ajouter un `type` au contrat casse le build ici. À l'exécution, il reçoit ce que le
 * serveur a bien voulu envoyer — un back plus récent que l'app installée — et on préfère un
 * message pauvre à un écran vide.
 */
function unnamedProblem(type: never): string {
  return `Erreur inattendue (${String(type)}).`;
}
