/**
 * Les mesures d'une séance, rendues lisibles.
 *
 * Pur, sans React, sans horloge implicite : c'est ce qui permet de le prouver sur des cas
 * limites — la mesure absente, la séance de moins d'une minute — sans monter un écran.
 *
 * ————— `null` n'est pas zéro, et c'est toute la règle ————————————————————————————————
 *
 * Le contrat le dit : « `null` veut dire *non mesuré*, jamais zéro — un tour de piste plat
 * a bien un dénivelé de zéro ». Un iPhone dans une poche ne mesure pas la fréquence
 * cardiaque ; afficher « 0 bpm » serait une donnée fausse, pas une donnée manquante.
 *
 * Une mesure absente ne s'affiche donc **pas du tout**. Elle ne s'affiche pas à zéro, ni
 * avec un tiret : la ligne est plus courte, et c'est exactement ce qu'il faut dire.
 */

/** `null` pour une mesure absente — l'appelant saute la ligne au lieu de la vider. */
export function formatDistance(meters: number | null): string | null {
  if (meters === null) {
    return null;
  }

  // Sous le kilomètre, le mètre est l'unité qui parle. Au-delà, plus personne ne compte en
  // mètres, et « 3046 m » se lit moins bien que « 3,05 km ».
  if (meters < 1000) {
    return `${meters} m`;
  }

  return `${(meters / 1000).toFixed(2).replace('.', ',')} km`;
}

export function formatElevation(meters: number | null): string | null {
  return meters === null ? null : `${meters} m D+`;
}

export function formatCalories(calories: number | null): string | null {
  return calories === null ? null : `${calories} kcal`;
}

export function formatHeartRate(bpm: number | null): string | null {
  return bpm === null ? null : `${bpm} bpm`;
}

/**
 * Une durée, en heures et minutes.
 *
 * Les secondes sont volontairement perdues : `durationSeconds` est la durée réellement
 * mesurée, à la seconde près, mais « 43 min 36 s » n'apprend rien de plus que « 43 min » à
 * quelqu'un qui regarde son historique. Le plancher à « moins d'une minute » évite le
 * « 0 min » d'une séance de quarante secondes.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return 'moins d’une minute';
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

/**
 * La date d'une séance, relative quand ça aide et absolue sinon.
 *
 * « Aujourd'hui » et « hier » sont ce que le joueur a en tête en rouvrant l'app. Au-delà,
 * le relatif devient un calcul mental — « il y a 9 jours », c'était quel jour ? — et la
 * date rend mieux service.
 *
 * `now` est un paramètre plutôt qu'un `new Date()` interne : un test qui dépend de l'heure
 * de son exécution ne prouve rien, et celui-ci passe des bornes de minuit.
 */
export function formatWhen(startedAt: string, now: Date): string {
  const date = new Date(startedAt);

  if (Number.isNaN(date.getTime())) {
    return startedAt;
  }

  // La comparaison porte sur le **jour civil local**, pas sur un écart de 24 heures : une
  // séance d'hier 20 h et une d'aujourd'hui 8 h sont à douze heures d'écart et ne sont pas
  // le même jour.
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);

  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  if (days === 0) {
    return `Aujourd’hui, ${time}`;
  }

  if (days === 1) {
    return `Hier, ${time}`;
  }

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
