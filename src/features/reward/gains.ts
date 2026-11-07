import type { AttributeState } from '@/design/tokens';
import {
  fillAfter,
  fillBefore,
  type DroppedItem,
  type RewardSummary,
  type SyncSummary,
  type SyncTotals,
  type XpNoCreditReason,
} from '@/features/reward/timeline';

export type BatchGains = {
  totals: SyncTotals | null;
  /**
   * La course de la barre, en « niveaux » : `start` est le remplissage de départ, `end` vaut
   * niveaux franchis + remplissage d'arrivée. La barre affiche la partie fractionnaire.
   */
  bar: { start: number; end: number; endFill: number };
  /** Les caractéristiques qui ont bougé, dans l'ordre de `attributeLabel`. */
  attributes: { attribute: AttributeState; gained: number }[];
  titles: RewardSummary['titlesUnlocked'];
  loot: DroppedItem[];
  coins: { before: number; after: number };
  /** Non nul quand tout le lot a été crédité sans rapporter d'XP (la marche, #80). */
  noCredit: XpNoCreditReason | null;
};

const CREDITED = ['strength', 'endurance', 'mobility', 'dexterity'] as const;

/** Le lot entier ramené à ce que le joueur a gagné — des additions de valeurs serveur, rien d'autre. */
export function batchGains(summary: SyncSummary): BatchGains {
  const first = summary.imported[0];
  const last = summary.imported[summary.imported.length - 1];

  if (first === undefined || last === undefined || summary.totals === null) {
    return {
      totals: null,
      bar: { start: 0, end: 0, endFill: 0 },
      attributes: [],
      titles: [],
      loot: [],
      coins: { before: 0, after: 0 },
      noCredit: null,
    };
  }

  const start = fillBefore(first.level);
  const endFill = fillAfter(last.level);
  const attributes = [
    ...CREDITED.map((attribute) => ({
      attribute,
      gained: summary.imported.reduce((sum, workout) => sum + workout.attributes[attribute].gained, 0),
    })),
    { attribute: 'vitality' as const, gained: last.attributes.vitality.after - first.attributes.vitality.before },
  ].filter(({ gained }) => gained !== 0);

  return {
    totals: summary.totals,
    bar: { start, end: summary.totals.levelAfter - summary.totals.levelBefore + endFill, endFill },
    attributes,
    titles: summary.imported.flatMap((workout) => workout.titlesUnlocked),
    loot: summary.imported.flatMap((workout) => workout.loot),
    coins: { before: first.coins.before, after: last.coins.after },
    noCredit: soleReason(summary),
  };
}

function soleReason(summary: SyncSummary): XpNoCreditReason | null {
  if ((summary.totals?.xpAwarded ?? 0) > 0) {
    return null;
  }
  const reason = summary.imported[0]?.xp.reason ?? null;
  return reason !== null && summary.imported.every((workout) => workout.xp.reason === reason) ? reason : null;
}
