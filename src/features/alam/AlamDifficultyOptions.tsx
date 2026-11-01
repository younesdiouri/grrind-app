import { Text, View } from 'react-native';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { SystemFrame } from '@/components/SystemFrame';
import { AlamGauges } from './AlamGauges.tsx';
import { probabilityPercent } from './format.ts';
import { alamStyles as s } from './styles.ts';

type Difficulty = components['schemas']['AlamDifficultyRequest']['difficulty'];

export function AlamDifficultyOptions({ run, canChoose, busy, onChoose }: {
  run: Pick<components['schemas']['AlamRun'], 'difficulty' | 'difficultyOptions'>;
  canChoose: boolean; busy: boolean; onChoose(difficulty: Difficulty): void;
}) {
  return <View style={s.group}>{run.difficultyOptions.map(option => {
    const selected = option.difficulty === run.difficulty;
    return <SystemFrame key={option.difficulty} tier={selected ? 'hero' : undefined} contentStyle={s.card}>
      <Text style={s.label}>{option.label}{selected ? ' · CHOIX ACTUEL' : ''}</Text>
      <Text style={s.body}>Probabilité de victoire : {probabilityPercent(option.probabilityMillionths)}</Text>
      <Text style={s.muted}>Cibles : {option.thresholdPermille / 10} % des cibles complètes</Text>
      <AlamGauges gauges={option.gauges} />
      {canChoose && <Button label={selected ? `${option.label} choisie` : `Choisir ${option.label}`}
        disabled={busy || selected} onPress={() => onChoose(option.difficulty)} />}
    </SystemFrame>;
  })}</View>;
}
