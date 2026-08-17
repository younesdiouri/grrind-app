/**
 * La fraction occupée d'une jauge de capacité — `memberCount / capacity`, protégée d'une
 * capacité à zéro.
 *
 * Pure, sans React : prouvée sur ses cas limites dans `guildCapacity.test.ts` sans monter
 * `CapacityGauge`. Ce n'est pas une règle de jeu — le serveur a déjà décidé la capacité,
 * `Guild.capacity` — seulement l'arithmétique qui en tire une largeur de piste.
 */
export function fillOf(memberCount: number, capacity: number): number {
  if (capacity <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, memberCount / capacity));
}
