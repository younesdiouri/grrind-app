/**
 * Une date civile, en toutes lettres : « 2 novembre 2025 ».
 *
 * `formatWhen` (côté progression) est *relatif* — « aujourd'hui », « hier » — parce qu'une
 * séance se compare à maintenant. Une fondation de guilde ou une inscription ne se comparent
 * à rien : « il y a 340 jours » demanderait un calcul mental, l'année ne s'efface donc jamais
 * ici, contrairement à `formatWhen` qui la tait pour une séance récente.
 *
 * Pure, sans React, sans horloge implicite : prouvée sur ses cas limites dans
 * `format.test.ts` sans monter un écran.
 */
export function formatCalendarDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Le temps qui reste avant l'extinction d'une Risāla — jamais un compte à rebours qui tourne
 * (#105) : une échéance à quinze jours ne mérite pas une seconde qui défile, et une horloge
 * vivante dans une liste est un `setState` par seconde sous un `FlatList`. L'écran rappelle
 * ce chiffre à chaque rendu — l'ouverture de l'onglet, un tirer-pour-rafraîchir — jamais entre
 * deux.
 *
 * `now` en paramètre, comme `formatWhen` : un test qui dépend de l'heure de son exécution ne
 * prouve rien, et celui-ci doit passer la bascule du dimanche 20 h — une réponse peut arriver
 * en vol avec une Risāla déjà éteinte pendant que le serveur calcule la suivante.
 */
export function risalaTimeLeft(expiresAt: string, now: Date): string {
  const date = new Date(expiresAt);

  if (Number.isNaN(date.getTime())) {
    return expiresAt;
  }

  const remainingMs = date.getTime() - now.getTime();

  // Une réponse en vol pendant la bascule peut porter une Risāla déjà éteinte : ce n'est pas
  // une erreur à cacher, c'est ce que le serveur vient d'envoyer.
  if (remainingMs <= 0) {
    return 'expirée';
  }

  // Prioritaire sur la comparaison de jour civil ci-dessous : une Risāla qui s'éteint dans
  // vingt minutes ne doit pas se lire « expire aujourd'hui » comme celle qui s'éteint dans dix
  // heures.
  if (remainingMs < 3_600_000) {
    return 'expire dans moins d’une heure';
  }

  const days = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000);

  if (days <= 0) {
    return 'expire aujourd’hui';
  }

  if (days === 1) {
    return 'expire demain';
  }

  return `expire dans ${days} jours`;
}

/**
 * L'échéance d'un tour de Risāla, en phrase absolue — jour et heure, comme le contrat le veut
 * (« un seul point sur la grille hebdomadaire »). Contrairement à `risalaTimeLeft`, rien ici
 * n'a besoin d'être *relatif* à maintenant : une échéance se dit, elle ne se compte pas — et
 * ça évite de dupliquer, pour une seule phrase, la comparaison de jour civil ci-dessus.
 */
export function formatTurnDeadline(deadline: string): string {
  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return deadline;
  }

  const day = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const minutes = date.getMinutes();
  const time = minutes === 0 ? `${date.getHours()} h` : `${date.getHours()} h ${String(minutes).padStart(2, '0')}`;

  return `${day}, ${time}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
