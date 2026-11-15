import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { characterSheet, color, guildUi } from '@/design/tokens';
import { DEFAULT_GUILD_EMBLEM, emblemColors, emblemSymbols, type Emblem } from '@/features/community/guildEmblem';
import { RADAR_ICON_PATH } from '@/features/progression/PerformanceRadar';

export function GuildEmblem({ emblem = DEFAULT_GUILD_EMBLEM, size = guildUi.crestSize }: {
  emblem?: Emblem | null; size?: number;
}) {
  const value = emblem ?? DEFAULT_GUILD_EMBLEM;
  const { label, attribute } = emblemSymbols[value.symbol];
  const tint = emblemColors[value.symbolColor].value;
  // Le liseré garde la forme lisible sans modifier les deux couleurs choisies.
  const outline = value.backgroundColor === 'NIGHT' ? color.text : color.background;
  return <View style={{ width: size, height: size }} accessible accessibilityRole="image"
    accessibilityLabel={`Emblème · ${label} · ${emblemColors[value.symbolColor].label} sur ${emblemColors[value.backgroundColor].label}`}>
    <Svg width={size} height={size} viewBox="0 0 44 44" aria-hidden>
      <Path d="M2 2h40v30L22 42 2 32Z" fill={emblemColors[value.backgroundColor].value} stroke={color.border} />
      <G transform="translate(7 5) scale(1.25)">
        <Path d={RADAR_ICON_PATH[attribute]} stroke={outline} strokeWidth={guildUi.emblemOutlineWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d={RADAR_ICON_PATH[attribute]} stroke={tint} strokeWidth={characterSheet.iconStroke} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {value.symbol === 'YOGA' && <Circle cx="12" cy="4" r="2" fill={tint} stroke={outline} strokeWidth={guildUi.emblemOutlineWidth - characterSheet.iconStroke} />}
      </G>
    </Svg>
  </View>;
}
