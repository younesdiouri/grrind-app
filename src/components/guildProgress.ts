import type { components } from '@/api/schema';

/**
 * Le remplissage de la barre d'XP d'un membre — une fraction d'affichage, pas une XP.
 *
 * Même règle que `fillBefore`/`fillAfter` dans `src/features/reward/timeline.ts` : ce n'est
 * pas un calcul de palier, le serveur a déjà décidé où il passe. Ce bloc ne fait que diviser
 * deux nombres qu'il a rendus. `xpToNextLevel === null` dit le niveau maximum ; il n'y a
 * plus de suivant, donc plus de fraction à faire — la barre reste pleine, jamais à zéro.
 *
 * Pure, sans React : prouvée sur ses cas limites dans `guildProgress.test.ts` sans monter
 * `GuildMemberRow`.
 */
export function progressFill(member: components['schemas']['GuildMember']): number {
  if (member.xpToNextLevel === null) {
    return 1;
  }

  const span = member.xpIntoLevel + member.xpToNextLevel;

  return span === 0 ? 1 : Math.min(1, Math.max(0, member.xpIntoLevel / span));
}
