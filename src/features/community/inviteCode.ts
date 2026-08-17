/**
 * Le code d'invitation, tel qu'il arrive dans le champ.
 *
 * Le serveur **normalise casse et espaces** : un code collé depuis un message doit donc passer
 * tel quel, capitale ou pas, espace parasite ou pas. Le champ ne refuse rien — il nettoie, ou
 * il laisse passer. C'est pour ça que la saisie forcée en majuscules vient d'ici et pas du
 * clavier : `autoCapitalize` ne majuscule que les débuts de mot, et un code collé n'en a pas.
 *
 * Ce que ce module ne fait **pas** : filtrer sur l'alphabet du serveur (pas de `O`, `0`, `I`,
 * `L`, `1`). Cet alphabet dit ce que le serveur *génère*, pas ce que le champ doit *accepter* —
 * un filtrage ici rendrait justement le collage sale refusé, ce que le ticket interdit
 * explicitement.
 */
export function sanitizeInviteCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** Un code d'invitation fait toujours huit caractères, une fois nettoyé. */
export const INVITE_CODE_LENGTH = 8;

export function isCompleteInviteCode(code: string): boolean {
  return code.length === INVITE_CODE_LENGTH;
}
