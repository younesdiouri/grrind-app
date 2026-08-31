import Svg, { Circle, Path } from 'react-native-svg';

import { color } from '@/design/tokens';

/**
 * La monnaie de GRRIND, dessinée plutôt qu'écrite.
 *
 * Le « G » gravé évite l'emoji — dont le dessin change avec l'OS — et garde le même jeton
 * dans le sac, les récompenses et les historiques. Le composant reste vectoriel pour tenir
 * aussi bien dans une ligne de 16 points que dans la mise en scène plein écran.
 */
export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10.5" fill={color.coin} />
      <Circle
        cx="12"
        cy="12"
        r="8"
        fill="none"
        stroke={color.coinHighlight}
        strokeWidth="1.25"
      />
      <Path
        d="M15.8 8.4A5 5 0 1 0 16 15.3V12h-3.5"
        fill="none"
        stroke={color.background}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}
