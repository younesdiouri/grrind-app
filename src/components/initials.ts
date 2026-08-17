/**
 * Les initiales d'un nom affiché : le premier caractère de chacun des deux premiers mots,
 * ou les deux premiers caractères d'un nom à un seul mot.
 *
 * Pure, sans React : c'est ce qui permet de la prouver sur ses cas limites — voir
 * `initials.test.ts` — sans monter `PlayerAvatar`, qui n'a aucune raison de payer Babel pour
 * ça (voir `scripts/module-hooks.ts`).
 *
 * Un nom vide n'est pas un cas que le contrat promet, mais une pastille qui ne rend rien
 * serait un bug plus trompeur qu'un point d'interrogation.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
