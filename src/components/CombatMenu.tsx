import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { EnemyPortrait } from '@/components/EnemyPortrait';
import { HudIcon } from '@/components/GameHud';
import { SystemFrame } from '@/components/SystemFrame';
import { color, combatMenu, control, frame, opacity, space, type, typography } from '@/design/tokens';

export type CombatMode = 'pve' | 'pvp';

export function CombatMenu({ mode, onMode, enemy, portrait, locked = false, busy = false, onFight, onDemo, onHistory }: {
  mode: CombatMode; onMode(mode: CombatMode): void; enemy?: components['schemas']['Enemy'];
  portrait?: ReactNode; locked?: boolean; busy?: boolean; onFight(): void; onDemo(): void; onHistory(): void;
}) {
  return <View style={styles.menu}>
    <View style={styles.tabs} accessibilityRole="tablist">
      {(['pve', 'pvp'] as const).map((key) => <Pressable key={key} accessibilityRole="tab" aria-selected={mode === key}
        testID={`combat-mode-${key}`} disabled={busy} onPress={() => onMode(key)}
        style={({ pressed }) => [styles.tab, mode === key && styles.active, pressed && styles.pressed]}>
        <Text style={[styles.tabLabel, mode === key && styles.activeLabel]}>{key === 'pve' ? 'PvE' : 'PvP'}</Text>
      </Pressable>)}
    </View>
    {mode === 'pve' ? <>
      {enemy && <SystemFrame tier="hero" contentStyle={styles.card}>
        <View style={styles.portrait}>{portrait ?? <EnemyPortrait enemy={enemy} />}</View>
        <Text style={styles.name} accessibilityRole="header">{enemy.name}</Text>
        {locked && <Text style={styles.note}>Disponible au niveau {enemy.minimumLevel}</Text>}
        <Button label={locked ? `Niveau ${enemy.minimumLevel}` : 'Combattre'} busy={busy} disabled={locked}
          accessibilityLabel={`Combattre — ${enemy.name}`} onPress={onFight} />
      </SystemFrame>}
      <Button label="Historique PvE" variant="quiet" disabled={busy} onPress={onHistory} />
    </> : <SystemFrame tier="hero" style={styles.pvpFrame} contentStyle={styles.card}>
      <View style={styles.rivalPortrait}><HudIcon name="inventory" size={combatMenu.rivalIconSize} /></View>
      <Text style={styles.name} accessibilityRole="header">Rival d’entraînement</Text>
      <Text style={styles.note}>Un avant-goût des défis. Les ligues arrivent.</Text>
      <Button label="Lancer un défi · Démo" disabled={busy} onPress={onDemo} />
      <Text style={styles.demoNote}>Sans classement ni récompense</Text>
    </SystemFrame>}
  </View>;
}

const styles = StyleSheet.create({
  menu: { gap: space.md },
  tabs: { flexDirection: 'row', gap: space.sm },
  tab: { flex: 1, minHeight: control.backSize, alignItems: 'center', justifyContent: 'center',
    borderWidth: control.borderWidth, borderColor: color.border, borderRadius: control.radius, backgroundColor: color.surface },
  active: { borderColor: color.accent, backgroundColor: color.surfaceRaised },
  tabLabel: { ...type.body, fontFamily: typography.display.semibold, color: color.textMuted },
  activeLabel: { color: color.accent },
  card: { padding: space.md, gap: space.md },
  portrait: { height: combatMenu.portraitHeight, backgroundColor: combatMenu.illustrationSurface, overflow: 'hidden' },
  rivalPortrait: { height: combatMenu.portraitHeight, alignItems: 'center', justifyContent: 'center',
    backgroundColor: combatMenu.illustrationSurface, borderBottomWidth: frame.standard.borderWidth, borderBottomColor: combatMenu.pvpAccent },
  pvpFrame: { borderColor: combatMenu.pvpAccent },
  name: { fontSize: combatMenu.titleSize, fontFamily: typography.display.bold, color: color.text },
  note: { ...type.body, color: color.textMuted },
  demoNote: { ...type.label, color: color.textMuted, textAlign: 'center', letterSpacing: 0 },
  pressed: { opacity: opacity.pressed },
});
