import { color, frame, radius, type FrameAccent, type FrameTier } from './tokens.ts';

export type FrameStyles = {
  outer: {
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    backgroundColor: string;
  };
  inner: {
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    inset: number;
  };
  accentSegment: {
    color: string;
    width: number;
    length: number;
  };
};

/**
 * Resolves the primary color associated with a frame accent role.
 *
 * @param accent - The semantic frame accent role.
 * @returns The hexadecimal or rgba color string.
 */
export function frameAccentColor(accent?: FrameAccent): string {
  switch (accent) {
    case 'accent':
      return color.accent;
    case 'celebrate':
      return color.celebrate;
    case 'gain':
      return color.gain;
    case 'loss':
      return color.loss;
    case 'danger':
      return color.danger;
    case 'coin':
      return color.coin;
    default:
      return color.accent;
  }
}

/**
 * Resolves the inner lining color associated with a frame accent role.
 *
 * @param accent - The semantic frame accent role.
 * @returns An rgba color string suitable for subtle inner borders.
 */
export function frameInnerAccentColor(accent?: FrameAccent): string {
  switch (accent) {
    case 'accent':
      return 'rgba(53, 228, 255, 0.2)';
    case 'celebrate':
      return 'rgba(247, 252, 255, 0.25)';
    case 'gain':
      return 'rgba(117, 255, 178, 0.2)';
    case 'loss':
    case 'danger':
      return 'rgba(255, 90, 205, 0.2)';
    case 'coin':
      return 'rgba(255, 180, 84, 0.2)';
    default:
      return 'rgba(53, 228, 255, 0.15)';
  }
}

/**
 * Computes pure layout and appearance tokens for a tactical system frame.
 *
 * @param tier - The visual hierarchy tier ('standard' | 'hero' | 'event').
 * @param accent - Optional semantic accent for highlight segments and borders.
 * @returns The complete set of outer, inner, and accent styles for rendering.
 */
export function computeFrameStyles(
  tier: FrameTier = 'standard',
  accent?: FrameAccent,
): FrameStyles {
  const config = frame.tier[tier];
  const primaryAccent = frameAccentColor(accent);
  const innerAccent = frameInnerAccentColor(accent);

  const borderColor = accent !== undefined ? primaryAccent : config.borderColor;
  const innerBorderColor = accent !== undefined ? innerAccent : config.innerBorderColor;

  const segmentLength = tier === 'event' ? 32 : tier === 'hero' ? 24 : 16;
  const outerRadius = tier === 'standard' ? radius.sm : radius.technical;
  const innerRadius = Math.max(0, outerRadius - 3);

  return {
    outer: {
      borderWidth: config.borderWidth,
      borderColor,
      borderRadius: outerRadius,
      backgroundColor: color.surface,
    },
    inner: {
      borderWidth: config.innerBorderWidth,
      borderColor: innerBorderColor,
      borderRadius: innerRadius,
      inset: 3,
    },
    accentSegment: {
      color: accent !== undefined ? primaryAccent : tier === 'standard' ? color.border : color.accent,
      width: config.accentWidth,
      length: segmentLength,
    },
  };
}
