import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { battleResultLabel, color, radius, space, type } from '@/design/tokens';

type BattleResultBadgeProps = {
  /**
   * L'enum du contrat, pas une phrase : la résolution en libellé se fait à l'intérieur, via
   * `battleResultLabel`, comme `RisalaCard` le fait pour `disciplineLabel`.
   */
  result: components['schemas']['BattleSummary']['result'];
};

/**
 * L'issue d'un combat, en une pastille.
 *
 * **Il n'y a que deux états, et il n'y en aura pas un troisième par accident.** `BattleResult`
 * est fermé à `VICTORY` / `DEFEAT` côté serveur et la colonne est `NOT NULL` : même un combat
 * interrompu par `max_turns` est tranché au meilleur ratio de points de vie, parce qu'un match
 * nul n'a pas de mise en scène. C'est ce qui permet de colorer une ligne d'historique sans
 * aucun repli — et le `Record` de `battleResultLabel` casse la compilation si un cas s'ajoute,
 * plutôt que de laisser paraître une pastille muette.
 *
 * **Une défaite n'emprunte rien au vocabulaire d'un refus** : ni `danger`, ni la couleur d'une
 * saisie invalide. Elle est éteinte, pas alarmante — voir `color.defeat`.
 */
export function BattleResultBadge({ result }: BattleResultBadgeProps) {
  const won = result === 'VICTORY';

  return (
    <View style={[styles.badge, won ? styles.victory : styles.defeat]}>
      <Text style={[styles.label, won ? styles.victoryLabel : styles.defeatLabel]}>
        {battleResultLabel[result].toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Le fond reste la surface de la carte : c'est le **trait et le mot** qui portent l'issue.
  // Une pastille pleine en vert au milieu d'une liste de vingt lignes se lirait comme une
  // alerte répétée, pas comme un état.
  victory: { borderColor: color.victory },
  defeat: { borderColor: color.defeat },
  label: { ...type.label },
  victoryLabel: { color: color.victory },
  defeatLabel: { color: color.defeat },
});
