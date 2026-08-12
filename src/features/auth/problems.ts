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

/**
 * Un appel qui a échoué : soit le serveur a nommé la panne, soit il n'a pas répondu.
 *
 * Le statut HTTP n'est **pas** porté ici. Il vit dans `problem.status`, comme le veut la
 * RFC 9457, et rien dans le client ne s'y branche : le `type` est l'identifiant stable, un
 * même statut couvrant des pannes qui n'appellent pas la même phrase.
 */
export type Failure = { kind: 'problem'; problem: ProblemDetails } | { kind: 'offline' };

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

export function failureFrom(error: unknown): Failure {
  const problem = asProblem(error);
  return problem === null ? OFFLINE : { kind: 'problem', problem };
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

/**
 * Ce 401 dit-il que la session est finie, ou seulement que le jeton d'accès a vieilli ?
 *
 * **La distinction est le tout**, et c'est le contrat qui la pose : `access-token-expired`
 * dit de rafraîchir et de rejouer la requête ; `access-token-invalid` et
 * `access-token-missing` disent de renvoyer le joueur sur l'écran de connexion. Rafraîchir
 * sur ces deux-là brûlerait un refresh token pour rien — et un refresh token, ici, ne se
 * dépense pas à la légère.
 *
 * Tout le reste rend `false` : un corps illisible (un proxy qui renvoie du HTML, une
 * passerelle en 502) ou un `type` que cette version du client ne connaît pas valent une
 * tentative de rafraîchissement. C'est le choix le moins destructeur — au pire un
 * rafraîchissement inutile, qui reste sérialisé ; déconnecter sur un doute, non.
 *
 * Les comparaisons portent sur l'union générée : renommer un de ces `type` côté back casse
 * la compilation ici, TypeScript refusant un `===` entre types disjoints.
 */
export function meansSessionOver(problem: ProblemDetails | null): boolean {
  return (
    problem?.type === 'https://grrind.app/problems/access-token-invalid' ||
    problem?.type === 'https://grrind.app/problems/access-token-missing'
  );
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

    // Les pannes de transport. Aucune n'est une situation de jeu : elles disent que l'app a
    // mal formé sa requête, ou qu'elle parle à un serveur qui n'est pas celui qu'elle croit.
    case 'https://grrind.app/problems/bad-request':
    case 'https://grrind.app/problems/method-not-allowed':
    case 'https://grrind.app/problems/unsupported-media-type':
      return "L'app a envoyé une requête que le serveur ne comprend pas.";

    case 'https://grrind.app/problems/not-found':
      return "Cette ressource n'existe pas.";

    case 'https://grrind.app/problems/invalid-credentials':
      return 'Adresse ou mot de passe incorrect.';

    // Les trois refus du jeton d'accès. Ils ne remontent jusqu'à un écran que si le
    // middleware n'a pas su les traiter — voir `meansSessionOver` juste en dessous, et
    // `session.refresh`. D'où des messages qui parlent à un joueur, pas à un développeur.
    case 'https://grrind.app/problems/access-token-expired':
    case 'https://grrind.app/problems/access-token-invalid':
    case 'https://grrind.app/problems/access-token-missing':
      return 'Ta session a expiré. Reconnecte-toi.';

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
