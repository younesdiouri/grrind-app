import type { BattleBeat, Ramp } from './timeline.ts';

/** Recherche logarithmique : le coût d’une frame ne croît pas avec les 10 000 tentatives. */
export function sampleRamp(ramp: Ramp, time: number): number {
  'worklet';
  const { input, output } = ramp;
  if (time <= input[0]) return output[0];
  if (time >= input[input.length - 1]) return output[output.length - 1];
  let low = 0;
  let high = input.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >>> 1;
    if (input[middle] <= time) low = middle;
    else high = middle;
  }
  return output[low] + (output[high] - output[low]) * (time - input[low]) / (input[high] - input[low]);
}

export function beatAt(beats: BattleBeat[], time: number): BattleBeat | undefined {
  'worklet';
  let low = 0;
  let high = beats.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (beats[middle].until <= time) low = middle + 1;
    else high = middle;
  }
  const beat = beats[low];
  return beat && time >= beat.at ? beat : undefined;
}

export function countBlowsAt(blows: number[], time: number): number {
  'worklet';
  let low = 0;
  let high = blows.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (blows[middle] <= time) low = middle + 1;
    else high = middle;
  }
  return low;
}
