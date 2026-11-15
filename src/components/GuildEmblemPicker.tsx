import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GuildEmblem } from '@/components/GuildEmblem';
import { GuildIdentity } from '@/components/GuildIdentity';
import { color, control, guildUi, opacity, space, type } from '@/design/tokens';
import { emblemColors, emblemSymbols, emblemWithColor, type Emblem, type EmblemColor } from '@/features/community/guildEmblem';

export function GuildEmblemPicker({ emblem, name, memberCount, disabled = false, onChange }: {
  emblem: Emblem; name: string; memberCount: number; disabled?: boolean; onChange(value: Emblem): void;
}) {
  return <View style={styles.editor}>
    <Text style={styles.heading} accessibilityRole="header">Emblème de la guilde</Text>
    <View style={styles.preview}><GuildIdentity name={name} memberCount={memberCount} emblem={emblem} /></View>
    <Text style={styles.label}>Symbole</Text>
    <View style={styles.symbols} accessibilityRole="radiogroup" accessibilityLabel="Symbole">
      {(Object.keys(emblemSymbols) as Emblem['symbol'][]).map(symbol => <Pressable key={symbol}
        testID={`guild-emblem-${symbol}`} accessibilityRole="radio" accessibilityLabel={emblemSymbols[symbol].label}
        aria-checked={emblem.symbol === symbol} accessibilityState={{ disabled }} disabled={disabled}
        onPress={() => onChange({ ...emblem, symbol })}
        style={({ pressed }) => [styles.symbol, emblem.symbol === symbol && styles.selected, pressed && styles.pressed]}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><GuildEmblem emblem={{ ...emblem, symbol }} /></View>
      </Pressable>)}
    </View>
    <ColorChoices label="Fond" selected={emblem.backgroundColor} disabled={disabled}
      onSelect={background => onChange(emblemWithColor(emblem, 'backgroundColor', background))} />
    <ColorChoices label="Couleur du symbole" selected={emblem.symbolColor} disabled={disabled}
      onSelect={symbolColor => onChange(emblemWithColor(emblem, 'symbolColor', symbolColor))} />
    <Text style={styles.note}>Le fond ou le symbole s’ajuste pour garder le contraste.</Text>
  </View>;
}

function ColorChoices({ label, selected, disabled, onSelect }: {
  label: string; selected: EmblemColor; disabled: boolean; onSelect(value: EmblemColor): void;
}) {
  return <View style={styles.editor}>
    <Text style={styles.label}>{label} · {emblemColors[selected].label}</Text>
    <View style={styles.colors} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {(Object.keys(emblemColors) as EmblemColor[]).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${label} · ${emblemColors[value].label}`}
          aria-checked={selected === value} accessibilityState={{ disabled }} disabled={disabled}
          onPress={() => onSelect(value)}
          style={({ pressed }) => [styles.swatchButton, selected === value && styles.selected, pressed && styles.pressed]}>
          <View style={[styles.swatch, { backgroundColor: emblemColors[value].value }]} />
          {selected === value && <Text style={styles.check}>✓</Text>}
        </Pressable>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  editor: { gap: space.sm },
  heading: { ...type.title, color: color.text },
  label: { ...type.body, color: color.text },
  note: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  preview: { backgroundColor: color.surface, borderWidth: control.borderWidth, borderColor: color.border, marginBottom: space.sm },
  symbols: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
  symbol: { width: guildUi.crestSize + space.md, height: guildUi.crestSize + space.md, alignItems: 'center', justifyContent: 'center',
    padding: space.sm, borderWidth: control.borderWidth, borderColor: color.border, borderRadius: control.radius },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatchButton: { width: control.backSize, height: control.backSize, justifyContent: 'center', alignItems: 'center',
    borderWidth: control.borderWidth, borderColor: color.border, borderRadius: control.radius },
  swatch: { width: space.lg, height: space.lg, borderRadius: control.radius, borderWidth: control.borderWidth, borderColor: color.textMuted },
  check: { position: 'absolute', right: 0, bottom: 0, backgroundColor: color.surface, color: color.accent, ...type.label },
  selected: { borderColor: color.accent },
  pressed: { opacity: opacity.pressed },
});
