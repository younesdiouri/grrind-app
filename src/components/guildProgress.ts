import type { components } from '@/api/schema';

/**
 * Le remplissage de la barre d'XP d'un membre — une fraction d'affichage, pas une XP.
 *
 * Même règle que `fillBefore`/`fillAfter` dans `src/features/reward/timeline.ts` : ce n'est
 * pas un calcul de palier, le serveur a déjà décidé où il passe. Ce bloc ne fait que diviser
 * deux nombres qu'il a rendus. `xpToNextLevel === null` dit le niveau maximum ; il n'y a
 * plus de suivant, donc plus de fraction à faire — la barre reste pleine, jamais à zéro.
 *
 * Le paramètre ne demande que les deux champs qu'il lit, communs à `Player` et à
 * `GuildMember` (qui l'étale) : `GET /api/players/{id}` sert la même barre que la liste, sans
 * recopier ce calcul pour un profil qui n'a ni `role` ni `joinedAt`.
 *
 * Pure, sans React : prouvée sur ses cas limites dans `guildProgress.test.ts` sans monter
 * `GuildMemberRow`.
 */
export function progressFill(
  member: Pick<components['schemas']['Player'], 'xpIntoLevel' | 'xpToNextLevel'>,
): number {
  if (member.xpToNextLevel === null) {
    return 1;
  }

  const span = member.xpIntoLevel + member.xpToNextLevel;

  return span === 0 ? 1 : Math.min(1, Math.max(0, member.xpIntoLevel / span));
}
