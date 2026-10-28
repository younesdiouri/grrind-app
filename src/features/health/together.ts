import type { components } from '@/api/schema';

export type TogetherStatus = components['schemas']['TogetherStatus'];

export function togetherLabel(value: TogetherStatus): string {
  switch (value.status) {
    case 'PENDING': return 'Sport ensemble · en attente';
    case 'INSUFFICIENT_EVIDENCE': return 'Sport ensemble · preuve insuffisante';
    case 'UNAVAILABLE': return 'Sport ensemble · indisponible pour cette séance';
    case 'VERIFIED': return `Sport ensemble ×${value.multiplier} · ${value.playerCount >= 4 ? '4+' : value.playerCount} joueur${value.playerCount > 1 ? 's' : ''} · +${value.bonusXp} XP`;
    default: return exhaustive(value.status);
  }
}

function exhaustive(_value: never): string { return 'Sport ensemble · statut indisponible'; }

/** Des sommes de valeurs serveur, groupées sans multiplier le bilan du lot. */
export function togetherGroups(values: (TogetherStatus | undefined)[]): { count: number; together: TogetherStatus }[] {
  const groups = new Map<string, { count: number; together: TogetherStatus }>();
  for (const value of values) {
    if (!value) continue; // Anciens bilans persistés avant le contrat Sport ensemble.
    const key = `${value.status}:${value.multiplier}:${value.playerCount}`;
    const previous = groups.get(key);
    if (!previous) groups.set(key, { count: 1, together: { ...value } });
    else {
      previous.count += 1;
      previous.together.soloXp += value.soloXp;
      previous.together.bonusXp += value.bonusXp;
      previous.together.totalXp += value.totalXp;
    }
  }
  return [...groups.values()];
}
