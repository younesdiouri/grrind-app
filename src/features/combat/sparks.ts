import { combatMotion } from '@/design/tokens';
import { impactAt, type Impact } from './camera.ts';

/**
 * La gerbe en cours à `time` : le dernier impact, et l'avancée de sa vie entre 0 et 1.
 *
 * Une seule gerbe à la fois : au tempo plancher, deux coups sont séparés de 200 ms, et la
 * nouvelle chasse l'ancienne — c'est ce qu'on veut lire.
 */
export function burstAt(impacts: Impact[], time: number) {
  'worklet';
  const impact = impactAt(impacts, time);
  if (!impact) return undefined;
  const progress = (time - impact.at) / combatMotion.sparkLife;
  return progress < 1 ? { impact, progress } : undefined;
}

/**
 * Une étincelle de la gerbe, relative au point d'impact.
 *
 * Le hasard est un hachage de l'indice : la même gerbe se redessine identique à chaque image,
 * et un saut d'horloge — le Passer, le ×2 — ne la fait pas scintiller.
 */
export function sparkAt(index: number, count: number, progress: number, strength: number) {
  'worklet';
  const seed = Math.sin(index * 12.9898) * 43758.5453;
  const jitter = seed - Math.floor(seed);
  const angle = (index / count) * Math.PI * 2 + jitter;
  const eased = 1 - (1 - progress) ** 3;
  const distance = combatMotion.sparkTravel * (0.5 + jitter) * Math.sqrt(strength) * eased;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    radius: combatMotion.sparkRadius * (1 - progress) * (0.6 + jitter * 0.8),
  };
}
