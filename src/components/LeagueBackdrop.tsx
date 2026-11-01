import { useId } from 'react';
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { color, leagueArt } from '@/design/tokens';
import type { LeagueTier } from '@/features/league/league';

const bezel = 'M112 30H208L228 50V144L208 164H112L92 144V50Z';
const facet = 'M0 -13L8 0L0 13L-8 0Z';
const fin = 'M0 0L-34 -18L-24 12L-6 26L4 16Z';

/** A mirrored fin and a crystal, repeated by preset; the face remains the quiet center. */
export function LeagueBackdrop({ tier, highlights = false, compact = false }: { tier: LeagueTier; highlights?: boolean; compact?: boolean }) {
  const preset = leagueArt.presets[tier];
  const id = useId().replace(/:/g, '');
  return <Svg width="100%" height="100%" viewBox={compact ? '64 -4 192 192' : '0 0 320 184'} aria-hidden>
    <Defs>
      <LinearGradient id={`${id}metal`} x1="0%" y1="0%" x2="85%" y2="100%">
        <Stop offset="0" stopColor={preset.light} /><Stop offset="0.38" stopColor={preset.metal} />
        <Stop offset="0.65" stopColor={preset.shade} /><Stop offset="1" stopColor={preset.metal} />
      </LinearGradient>
      <RadialGradient id={`${id}halo`}>
        <Stop offset="0" stopColor={preset.metal} stopOpacity=".24" />
        <Stop offset="1" stopColor={preset.metal} stopOpacity="0" />
      </RadialGradient>
    </Defs>
    {highlights ? <>
      {preset.halo && <Ellipse cx="160" cy="96" rx="148" ry="86" fill={`url(#${id}halo)`} />}
      <Path d="M92 74V50L112 30H148M172 164H208L228 144V120" fill="none" stroke={preset.light} strokeWidth="2" />
      {tier === 'DIAMOND' && [-1, 1].map(side => <G key={side} transform={`translate(${160 + side * 122} 46)`}>
        <Path d={facet} fill={preset.light} transform="scale(.45)" />
      </G>)}
    </> : <>
      {preset.halo && <Ellipse cx="160" cy="96" rx="148" ry="86" fill={`url(#${id}halo)`} />}
      <Path d="M160 20L240 94L160 180L80 94Z" fill={preset.shade} opacity=".13" />
      {[-1, 1].map(side => <G key={side} transform={`translate(160 0) scale(${side} 1)`}>
        <Path d={facet} transform="translate(76 101) rotate(30) scale(.75)" fill={preset.shade} />
        {Array.from({ length: preset.rows }, (_, row) => <G key={row} transform={`translate(${row * 13} ${row * 19}) scale(${1 - row * .18})`}>
          {Array.from({ length: preset.fins }, (_, index) => <G key={index}
            transform={`translate(${-69 - index * (preset.spread / 4)} ${125 - index * 18}) rotate(${index * 9 - preset.spread})`}>
            <Path d={fin} fill={`url(#${id}metal)`} stroke={preset.shade} strokeWidth="1" />
            <Path d="M-34 -18L-6 26L-9 5Z" fill={preset.light} opacity=".45" />
          </G>)}
        </G>)}
      </G>)}
      <Path d={bezel} fill={color.background} stroke={`url(#${id}metal)`} strokeWidth="5" />
      {preset.double && <Path d={bezel} transform="translate(160 97) scale(1.10 1.08) translate(-160 -97)"
        fill="none" stroke={preset.metal} strokeWidth="1" opacity=".6" />}
      <Path d="M94 72V51L113 32H137M183 162H207L226 143V122" fill="none" stroke={preset.light} strokeWidth="2" />
      {Array.from({ length: preset.crown }, (_, index) => {
        const step = index - (preset.crown - 1) / 2;
        return <G key={index} transform={`translate(${160 + step * 18} ${17 + Math.abs(step) * 5}) rotate(${step * 12}) scale(${1 - Math.abs(step) * .14} .8)`}>
          <Path d={facet} fill={`url(#${id}metal)`} stroke={preset.light} strokeWidth=".6" />
          <Path d="M0 -13V13L-8 0Z" fill={preset.light} opacity=".4" />
        </G>;
      })}
      <Path d="M144 169L160 176L176 169L160 164Z" fill={preset.metal} />
    </>}
  </Svg>;
}
