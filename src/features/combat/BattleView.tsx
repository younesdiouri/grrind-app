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

import { hpBarFill, HpBar } from '@/components/HpBar';
import { battleResultLabel, color, scale, space, type } from '@/design/tokens';
import { formatTurns } from './format.ts';
import {
  buildBattleTimeline,
  type Battle,
  type BattleTally,
  type Ramp,
  type SideRamps,
} from './timeline.ts';

/**
 * Le combat, joué.
 *
 * **Une seule horloge.** `clock` est la seule valeur animée de l'écran ; tout le reste en est
 * *dérivé* par `interpolate`, sur des rampes que `buildBattleTimeline` a calculées hors de
 * React. C'est ce qui garantit que les barres, les chiffres et les annonces ne désynchronisent
 * jamais, que le saut est instantané et exact — il suffit de poser l'horloge à la fin — et que
 * l'ensemble tourne sur le thread UI sans un seul rendu React pendant la séquence.
 *
 * **Aucun `setState` dans une boucle.** Les compteurs passent par `useAnimatedProps` sur un
 * `TextInput` : c'est le seul moyen d'écrire du texte depuis un worklet, `Animated.Text`
 * n'animant pas son contenu. Le retour vers JS est réservé à l'haptique, via `scheduleOnRN` :
 * `runOnJS` est déprécié depuis Reanimated 4.
 *
 * **Un `TextInput` animé doit porter une largeur.** Il n'en a aucune d'intrinsèque : sans
 * contrainte il s'effondre, et ce qui le suit se pose par-dessus. C'est ce qui donnait deux
 * nombres superposés au premier essai sur appareil — la valeur était juste, la place manquait.
 *
 * ————— Trois zones, et le milieu porte le combat ——————————————————————————————————————
 *
 * La première version mettait les annonces *sur* les combattants, en haut et en bas, et
 * laissait tout le centre vide. C'était doublement raté : l'écran paraissait creux, et surtout
 * l'œil devait faire l'aller-retour entre deux bords à chaque échange pour savoir qui frappait.
 *
 * L'adversaire tient donc le haut, le joueur le bas — leur **état** : un nom, une barre, des
 * points de vie — et le centre porte **ce qui arrive** : qui encaisse, combien, ce que l'armure
 * a absorbé, une esquive, une relance. Un seul endroit à regarder pendant que les barres
 * bougent dans la périphérie, ce qui est précisément ce que la périphérie sait faire.
 *
 * Les annonces sont **empilées et disjointes** : les six coexistent dans la mise en page, une
 * seule est allumée à la fois, parce qu'un battement ne porte qu'une forme. C'est garanti par
 * construction dans `timeline.ts` et vérifié par ses tests, pas par une condition ici.
 *
 * ————— Et la fin est un écran, pas un badge ————————————————————————————————————————————
 *
 * Le centre devient le bilan quand le verdict tombe : l'issue en grand, le coup qui a conclu,
 * et ce qui s'est passé en chiffres. C'est la leçon du #79 poussée d'un cran — un écran qui
 * s'arrête sur une pastille de cent pixels ne récompense pas les quinze secondes qu'on vient
 * de regarder.
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

  /** Le bilan chasse les annonces : à partir du verdict, il n'y a plus rien d'autre à lire. */
  const actionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [verdict.at - 1, verdict.at], [1, 0], Extrapolation.CLAMP),
  }));

  const recapStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      [verdict.at, verdict.at + (verdict.until - verdict.at) / 2],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    // `onLayout` et non un effet : la séquence part quand l'écran a ses dimensions, pas avant.
    // C'est l'idiome de `SyncSummaryView`, et il évite une première frame jouée dans le vide.
    <Pressable style={styles.screen} onPress={touch} onLayout={play} accessibilityRole="button">
      <Fighter clock={clock} side="enemy" name={battle.enemy.name} ramps={timeline.enemy} stats={battle.enemy} />

      <View style={styles.stage}>
        <Animated.View style={[styles.layer, actionsStyle]}>
          <Call clock={clock} flash={timeline.enemy.damageFlash}>
            <Blow
              clock={clock}
              who={battle.enemy.name}
              ramps={timeline.enemy}
              tone={styles.dealt}
            />
          </Call>

          <Call clock={clock} flash={timeline.player.damageFlash}>
            <Blow clock={clock} who="Toi" ramps={timeline.player} tone={styles.taken} />
          </Call>

          <Call clock={clock} flash={timeline.enemy.dodgeFlash}>
            <Announce who={battle.enemy.name} word="esquive" />
          </Call>

          <Call clock={clock} flash={timeline.player.dodgeFlash}>
            <Announce who="Toi" word="esquives" />
          </Call>

          <Call clock={clock} flash={timeline.enemy.extraFlash}>
            <Announce who={battle.enemy.name} word="rejoue" tone={styles.extra} />
          </Call>

          <Call clock={clock} flash={timeline.player.extraFlash}>
            <Announce who="Toi" word="rejoues" tone={styles.extra} />
          </Call>
        </Animated.View>

        <Animated.View style={[styles.layer, recapStyle]} pointerEvents="none">
          <Recap battle={battle} tally={timeline.tally} done={done} />
        </Animated.View>
      </View>

      <Fighter clock={clock} side="player" name="Toi" ramps={timeline.player} stats={battle.player} />
    </Pressable>
  );
}

/**
 * Une annonce du centre : elle paraît sur son éclat et s'efface avec lui.
 *
 * Les six cohabitent dans la mise en page mais jamais à l'écran — un battement ne porte qu'une
 * forme, et `timeline.ts` le garantit par construction. Les empiler évite la seule alternative,
 * qui serait de choisir laquelle rendre à chaque frame : c'est-à-dire un `setState` dans la
 * boucle, ce que ce fichier n'a pas le droit de faire.
 */
function Call({
  clock,
  flash,
  children,
}: {
  clock: SharedValue<number>;
  flash: Ramp;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const lit = interpolate(clock.value, flash.input, flash.output, Extrapolation.CLAMP);

    return { opacity: lit, transform: [{ scale: scale.from + lit * (1 - scale.from) }] };
  });

  return <Animated.View style={[styles.layer, style]}>{children}</Animated.View>;
}

/** Un coup encaissé : qui, combien, et ce que l'armure a retenu. */
function Blow({
  clock,
  who,
  ramps,
  tone,
}: {
  clock: SharedValue<number>;
  who: string;
  ramps: SideRamps;
  tone: { color: string };
}) {
  const damageProps = useAnimatedProps(() => {
    const text = `-${Math.round(interpolate(clock.value, ramps.damage.input, ramps.damage.output, Extrapolation.CLAMP))}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  const absorbedProps = useAnimatedProps(() => {
    const text = `${Math.round(interpolate(clock.value, ramps.mitigated.input, ramps.mitigated.output, Extrapolation.CLAMP))} absorbés`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  // Éteinte quand il n'y a rien à absorber : « 0 absorbés » dirait le contraire de ce qui se
  // passe chez un combattant sans armure. La décision est dans la rampe, pas ici.
  const absorbedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      clock.value,
      ramps.mitigatedFlash.input,
      ramps.mitigatedFlash.output,
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.call}>
      <Text style={styles.who} numberOfLines={1}>
        {who.toUpperCase()}
      </Text>
      <AnimatedTextInput
        editable={false}
        style={[styles.hit, tone]}
        animatedProps={damageProps}
        defaultValue="0"
      />
      <Animated.View style={absorbedStyle}>
        <AnimatedTextInput
          editable={false}
          style={styles.absorbed}
          animatedProps={absorbedProps}
          defaultValue=""
        />
      </Animated.View>
    </View>
  );
}

/** Une esquive, une relance : un mot, et de qui. */
function Announce({ who, word, tone }: { who: string; word: string; tone?: { color: string } }) {
  return (
    <View style={styles.call}>
      <Text style={styles.who} numberOfLines={1}>
        {who.toUpperCase()}
      </Text>
      <Text style={[styles.word, tone]}>{word}</Text>
    </View>
  );
}

/**
 * L'écran de fin.
 *
 * Il dit **ce qui s'est passé**, pas seulement qui a gagné. Les chiffres viennent du bilan de
 * `timeline.ts` — des sommes sur ce que le serveur a déjà envoyé, dont rien n'est accordé à
 * personne : voir le docblock de `BattleTally` pour la frontière avec la logique de jeu.
 */
function Recap({ battle, tally, done }: { battle: Battle; tally: BattleTally; done: boolean }) {
  const won = battle.result === 'VICTORY';

  return (
    <View style={styles.recap}>
      <Text style={[styles.verdict, won ? styles.verdictWon : styles.verdictLost]}>
        {battleResultLabel[battle.result]}
      </Text>

      <Text style={styles.against} numberOfLines={2}>
        {won ? 'Tu as vaincu' : 'Tu es tombé face à'} {battle.enemy.name}
      </Text>

      {tally.lastBlow !== null && (
        <Text style={styles.lastBlow}>
          Coup fatal : {tally.lastBlow.damage} de dégâts
          {tally.lastBlow.by === 'PLAYER' ? ' — le tien' : ' — le sien'}
        </Text>
      )}

      <View style={styles.tally}>
        <Score label="Tours" value={formatTurns(tally.turns).split(' ')[0]} />
        <Score label="Coups portés" value={String(tally.blowsLanded)} />
        <Score label="Dégâts infligés" value={String(tally.damageDealt)} />
        <Score label="Dégâts subis" value={String(tally.damageTaken)} />
        {/* Les trois lignes suivantes ne paraissent que si elles ont eu lieu : un « 0 esquive »
            occupe la place d'une information sans en être une. */}
        {tally.damageAbsorbed > 0 && (
          <Score label="Absorbés par ton armure" value={String(tally.damageAbsorbed)} />
        )}
        {tally.dodges > 0 && <Score label="Tes esquives" value={String(tally.dodges)} />}
        {tally.extraTurns > 0 && <Score label="Tes relances" value={String(tally.extraTurns)} />}
        {won && <Score label="Vie restante" value={String(tally.hpLeft)} />}
      </View>

      {/* L'affordance de sortie ne paraît qu'à la fin : avant, le seul geste est le saut, et
          l'annoncer pendant la séquence inviterait à la manquer. */}
      {done && <Text style={styles.exit}>Touche pour revenir</Text>}
    </View>
  );
}

function Score({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.score}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
    </View>
  );
}

/**
 * Un combattant : son nom, sa barre, ses points de vie.
 *
 * Il ne porte plus que son **état** — ce qui lui arrive se dit au centre. Il reçoit son camp
 * entier (`SideRamps`) plutôt que des rampes éparses : deux blocs symétriques qui prennent
 * chacun le leur ne peuvent pas être intervertis par distraction, et la confusion des camps est
 * l'erreur qui coûte le plus cher ici — elle produit une animation qui a l'air de marcher.
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
  stats: { damage: number; mitigationPercent: number; dodgePercent: number };
}) {
  const barStyle = useAnimatedStyle(() => ({
    width: `${(interpolate(clock.value, ramps.hp.input, ramps.hp.output, Extrapolation.CLAMP) / ramps.maxHp) * 100}%`,
  }));

  const hpProps = useAnimatedProps(() => {
    const text = String(
      Math.round(interpolate(clock.value, ramps.hp.input, ramps.hp.output, Extrapolation.CLAMP)),
    );
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <View style={styles.fighter}>
      <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {name}
      </Text>

      <HpBar side={side}>
        <Animated.View style={[hpBarFill[side], barStyle]} />
      </HpBar>

      <View style={styles.line}>
        <View style={styles.hp}>
          <AnimatedTextInput
            editable={false}
            style={styles.hpValue}
            animatedProps={hpProps}
            // Statique, jamais dans `animatedProps` : c'est la valeur du premier rendu, et la
            // ranger avec le texte animé en affiche deux, superposés.
            defaultValue={String(ramps.maxHp)}
          />
          <Text style={styles.hpMax}>/ {ramps.maxHp}</Text>
        </View>

        <Text style={styles.stats} numberOfLines={1}>
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
    paddingTop: space.xl,
    paddingBottom: space.xl,
  },
  fighter: { gap: space.sm },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  name: { ...type.title, color: color.text },
  hp: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  /**
   * La largeur est **la** correction du premier essai sur appareil.
   *
   * Un `TextInput` n'a aucune largeur intrinsèque : sans contrainte, il s'effondre, le
   * « / max » qui le suit vient se poser par-dessus le chiffre — d'où les deux nombres
   * superposés — et sur l'autre camp il se réduit à « … ». `minWidth` lui garde la place de
   * quatre chiffres, ce que même les 3600 points de vie du Souverain des cendres n'excèdent
   * pas.
   */
  hpValue: {
    ...type.body,
    color: color.text,
    padding: 0,
    minWidth: space.xl + space.md,
  },
  hpMax: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  stats: { ...type.label, color: color.textMuted, letterSpacing: 0, flexShrink: 1 },

  /** Le centre : tout ce qui arrive s'y annonce, et le bilan l'occupe à la fin. */
  stage: { flex: 1, justifyContent: 'center' },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  call: { alignItems: 'center', gap: space.xs },
  who: { ...type.label, color: color.textMuted },
  hit: { ...type.display, padding: 0, textAlign: 'center' },
  /** Ce que le joueur inflige — la couleur de l'adversaire, puisque c'est lui qui l'encaisse. */
  dealt: { color: color.hpEnemy },
  taken: { color: color.hpPlayer },
  absorbed: { ...type.label, color: color.textMuted, padding: 0, textAlign: 'center' },
  word: { ...type.title, color: color.text },
  extra: { color: color.celebrate },

  recap: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.md },
  verdict: { ...type.display, textAlign: 'center' },
  verdictWon: { color: color.victory },
  verdictLost: { color: color.defeat },
  against: { ...type.body, color: color.text, textAlign: 'center' },
  lastBlow: { ...type.label, color: color.textMuted, letterSpacing: 0, textAlign: 'center' },
  tally: { alignSelf: 'stretch', gap: space.xs, paddingTop: space.sm },
  score: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  scoreLabel: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  scoreValue: { ...type.label, color: color.text, letterSpacing: 0 },
  exit: { ...type.label, color: color.textMuted, letterSpacing: 0, paddingTop: space.md },
});
