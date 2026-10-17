import type { FighterAttachments } from './equipmentArtwork';

/** Tête du Murīd original, coordonnées du canevas 1024². Une calibration commune à tous les HEAD. */
export const MURID_ATTACHMENTS: Record<'back' | 'front', FighterAttachments> = {
  back: {
    idle: { x: 0.584, y: 0.312, span: 0.105, rotate: 18 },
    attack: { x: 0.605, y: 0.382, span: 0.105, rotate: 18 },
    hit: { x: 0.407, y: 0.286, span: 0.105, rotate: -28 },
    critical: { x: 0.675, y: 0.323, span: 0.105, rotate: 18 },
    dodge: { x: 0.510, y: 0.393, span: 0.105, rotate: 18 },
    combo: { x: 0.597, y: 0.303, span: 0.105, rotate: 18 },
    replay: { x: 0.602, y: 0.340, span: 0.105, rotate: 18 },
  },
  front: {
    idle: { x: 0.431, y: 0.313, span: 0.105, rotate: -18 },
    attack: { x: 0.444, y: 0.423, span: 0.105, rotate: -18 },
    hit: { x: 0.556, y: 0.294, span: 0.105, rotate: 28 },
    critical: { x: 0.378, y: 0.343, span: 0.105, rotate: -18 },
    dodge: { x: 0.415, y: 0.376, span: 0.105, rotate: -18 },
    combo: { x: 0.414, y: 0.298, span: 0.105, rotate: -18 },
    replay: { x: 0.418, y: 0.367, span: 0.105, rotate: -18 },
  },
};
