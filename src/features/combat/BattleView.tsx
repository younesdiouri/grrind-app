import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  type SharedValue,
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BattleResultBadge } from '@/components/BattleResultBadge';
import { hpBarFill, HpBar } from '@/components/HpBar';
import { color, scale, space, type } from '@/design/tokens';
import { buildBattleTimeline, type Battle, type SideRamps } from './timeline.ts';

/**
 * Le combat, joué.
 *
 * **Une seule horloge.** `clock` est la seule valeur animée de l'écran ; tout le reste en est
 * *dérivé* par `interpolate`, sur des rampes que `buildBattleTimeline` a calculées hors de
 * React. C'est ce qui garantit que les deux barres, les chiffres et les éclats ne
 * désynchronisent jamais, que le saut est instantané et exact — il suffit de poser l'horloge à
 * la fin — et que l'ensemble tourne sur le thread UI sans un seul rendu React pendant la
 * séquence.
 *
 * **Aucun `setState` dans une boucle.** Les compteurs passent par `useAnimatedProps` sur un
 * `TextInput` : c'est le seul moyen d'écrire du texte depuis un worklet, `Animated.Text`
 * n'animant pas son contenu. Le retour vers JS est réservé à l'haptique, via `scheduleOnRN` —
 * `runOnJS` est déprécié depuis Reanimated 4.
 *
 * ————— La lecture, de haut en bas ——————————————————————————————————————————————————————
 *
 * L'adversaire en haut, le joueur en bas, et **rien entre les deux** : ce qui se passe se
 * passe *sur* un combattant — un chiffre de dégât chez celui qui l'encaisse, une esquive chez
 * celui qui esquive. Un bandeau central qui narrerait les coups obligerait à lire deux
 * endroits par échange, à 260 ms l'échange.
 *
 * Les deux blocs sont **symétriques et reçoivent leur camp entier** (`SideRamps`). C'est ce
 * qui rend impossible l'erreur qui coûte le plus cher ici : intervertir les camps produit une
 * animation qui a l'air de marcher.
 *
 * Ce que ce composant **ne fait pas** : construire les rampes, ni décider du tempo. Les deux
 * vivent dans `timeline.ts` et s'y prouvent sur les fixtures, sans monter la moindre vue.
 */

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function BattleView({
  battle,
  onDismiss,
}: {
  battle: Battle;
  /**
   * Sortir. Le composant dit **quand** le joueur veut partir, la route décide de ce que ça
   * veut dire — une animation ne connaît pas la pile de navigation.
   */
  onDismiss?: () => void;
}) {
  const timeline = useMemo(() => buildBattleTimeline(battle), [battle]);
  const clock = useSharedValue(0);

  /**
   * La séquence est-elle arrivée au bout.
   *
   * C'est le **seul** `setState` de tout l'écran, et il tombe une fois, à la fin. La règle du
   * fichier interdit la boucle, pas l'événement terminal : rendre l'affordance de sortie
   * demande un rendu React, et il n'y en a qu'un.
   */
  const [done, setDone] = useState(false);

  const verdict = timeline.beats[timeline.beats.length - 1];

  const play = () => {
    setDone(false);
    clock.value = 0;
    clock.value = withTiming(
      timeline.duration,
      { duration: timeline.duration, easing: Easing.linear },
      (finished) => {
        'worklet';
        // `finished` est faux quand `cancelAnimation` est passé par là — c'est le saut, qui
        // marque la fin lui-même. Sans ce test, le rappel du saut écraserait son propre état.
        if (finished === true) {
          scheduleOnRN(setDone, true);
        }
      },
    );
  };

  /**
   * Le saut. Toucher l'écran amène à l'état final immédiatement.
   *
   * Il n'y a rien à calculer : poser l'horloge à la fin met chaque interpolation sur sa
   * dernière valeur, et ces dernières valeurs sont celles que le serveur a écrites.
   */
  const skip = () => {
    cancelAnimation(clock);
    clock.value = timeline.duration;
    setDone(true);
  };

  /**
   * Le geste unique de l'écran : **sauter tant qu'il reste à sauter, puis sortir**.
   *
   * C'est ce qu'un joueur fait sans qu'on le lui dise — il tape pour accélérer, il tape pour
   * partir. Le même geste que l'écran de récompense, pour la même raison.
   */
  const touch = () => {
    if (done) {
      onDismiss?.();
      return;
    }

    skip();
  };

  // Le seul aller-retour vers JS de toute la séquence : un choc par coup **porté**. Les
  // esquives n'en déclenchent pas — rien n'a été encaissé, et vibrer dirait le contraire.
  useAnimatedReaction(
    () => timeline.blows.filter((at) => clock.value >= at).length,
    (landed, previous) => {
      if (previous !== null && landed > previous) {
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Medium);
      }
    },
  );

  const verdictStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      [verdict.at, verdict.at + (verdict.until - verdict.at) / 3],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    // `onLayout` et non un effet : la séquence part quand l'écran a ses dimensions, pas
    // avant. C'est l'idiome de `SyncSummaryView`, et il évite une première frame jouée dans
    // le vide sur un appareil lent.
    <Pressable style={styles.screen} onPress={touch} onLayout={play} accessibilityRole="button">
      <Fighter
        clock={clock}
        side="enemy"
        name={battle.enemy.name}
        ramps={timeline.enemy}
        stats={battle.enemy}
      />

      <Animated.View style={[styles.verdict, verdictStyle]}>
        <BattleResultBadge result={battle.result} />
        {/* L'affordance de sortie ne paraît qu'à la fin : avant, le seul geste est le saut, et
            annoncer « touche pour sortir » pendant la séquence inviterait à la manquer. */}
        {done && <Text style={styles.exit}>Touche pour revenir</Text>}
      </Animated.View>

      <Fighter
        clock={clock}
        side="player"
        name="Toi"
        ramps={timeline.player}
        stats={battle.player}
      />
    </Pressable>
  );
}

/**
 * Un combattant : son nom, sa barre, ce qu'il encaisse.
 *
 * Il reçoit **son camp entier** plutôt que six rampes éparses. Deux blocs symétriques qui
 * prennent chacun le leur ne peuvent pas être intervertis par distraction.
 */
function Fighter({
  clock,
  side,
  name,
  ramps,
  stats,
}: {
  clock: SharedValue<number>;
  side: 'player' | 'enemy';
  name: string;
  ramps: SideRamps;
  stats: { hp: number; damage: number; mitigationPercent: number; dodgePercent: number };
}) {
  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(clock.value, ramps.hp.input, ramps.hp.output, Extrapolation.CLAMP) / ramps.maxHp * 100}%`,
  }));

  const hpProps = useAnimatedProps(() => ({
    text: String(
      Math.round(interpolate(clock.value, ramps.hp.input, ramps.hp.output, Extrapolation.CLAMP)),
    ),
    defaultValue: String(ramps.maxHp),
  }));

  const damageProps = useAnimatedProps(() => ({
    text: `-${Math.round(interpolate(clock.value, ramps.damage.input, ramps.damage.output, Extrapolation.CLAMP))}`,
    defaultValue: '',
  }));

  const damageStyle = useAnimatedStyle(() => {
    const flash = interpolate(
      clock.value,
      ramps.damageFlash.input,
      ramps.damageFlash.output,
      Extrapolation.CLAMP,
    );

    return { opacity: flash, transform: [{ scale: scale.from + flash * (1 - scale.from) }] };
  });

  const dodgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      ramps.dodgeFlash.input,
      ramps.dodgeFlash.output,
      Extrapolation.CLAMP,
    ),
  }));

  const extraStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      ramps.extraFlash.input,
      ramps.extraFlash.output,
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.fighter}>
      <View style={styles.line}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        <View style={styles.marks}>
          {/* Les trois marques cohabitent dans la mise en page mais jamais à l'écran : leurs
              éclats sont disjoints par construction, un battement ne portant qu'une forme. */}
          <Animated.View style={dodgeStyle}>
            <Text style={styles.dodge}>ESQUIVE</Text>
          </Animated.View>
          <Animated.View style={extraStyle}>
            <Text style={styles.extra}>REJOUE</Text>
          </Animated.View>
          <Animated.View style={damageStyle}>
            <AnimatedTextInput
              editable={false}
              // Le clavier ne doit jamais s'ouvrir : ce `TextInput` n'existe que parce qu'il
              // est le seul texte qu'un worklet sait écrire.
              pointerEvents="none"
              style={[styles.damage, side === 'player' ? styles.damagePlayer : styles.damageEnemy]}
              animatedProps={damageProps}
            />
          </Animated.View>
        </View>
      </View>

      <HpBar side={side}>
        <Animated.View style={[hpBarFill[side], barStyle]} />
      </HpBar>

      <View style={styles.line}>
        <View style={styles.hp}>
          <AnimatedTextInput
            editable={false}
            pointerEvents="none"
            style={styles.hpValue}
            animatedProps={hpProps}
          />
          <Text style={styles.hpMax}>/ {ramps.maxHp}</Text>
        </View>

        <Text style={styles.stats}>
          {stats.damage} dég. · {stats.mitigationPercent} % arm. · {stats.dodgePercent} % esq.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.background,
    padding: space.lg,
    justifyContent: 'space-between',
  },
  fighter: { gap: space.sm },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  name: { ...type.title, color: color.text, flexShrink: 1 },
  marks: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dodge: { ...type.label, color: color.textMuted },
  extra: { ...type.label, color: color.celebrate },
  damage: { ...type.title, padding: 0 },
  damagePlayer: { color: color.hpEnemy },
  damageEnemy: { color: color.hpPlayer },
  hp: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  hpValue: { ...type.body, color: color.text, padding: 0 },
  hpMax: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  stats: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  verdict: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  exit: { ...type.label, color: color.textMuted, letterSpacing: 0 },
});
