import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  withRepeat,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CoinAmount } from '@/components/CoinAmount';
import { AmbientBackdrop } from '@/components/AmbientBackdrop';
import { hpBarFill, HpBar } from '@/components/HpBar';
import { ItemCard } from '@/components/ItemCard';
import { SystemFrame } from '@/components/SystemFrame';
import {
  ambient,
  battleResultLabel,
  color,
  combatMotion,
  combatEffects,
  control,
  duration,
  scale,
  space,
  radius,
  type,
  typography,
} from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';

import { hasBattleReward } from './reward.ts';
import { EnemySprite, type EnemyArtwork } from './EnemySprite';
import { enemyArtworkOf } from './enemyPresentation';
import { entranceMotionAt, type EntrancePhase } from './entranceMotion';
import {
  buildBattleTimeline,
  sampleRamp,
  countBlowsAt,
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

export function BattleView({ battle, enemyArt, ...props }: {
  battle: Battle;
  enemyArt?: EnemyArtwork;
  demo?: boolean;
  demoTime?: number;
  onDismiss?: () => void;
}) {
  const artwork = useMemo(() => enemyArt ?? enemyArtworkOf(battle.enemy), [enemyArt, battle.enemy]);
  return <PresentedBattle key={battle.id} {...props} battle={battle} artwork={artwork}
    introduction={enemyArt?.introduction ?? battle.enemy.introduction ?? undefined} />;
}

function PresentedBattle({ artwork, ...props }: {
  battle: Battle;
  artwork?: EnemyArtwork;
  introduction?: string;
  demo?: boolean;
  demoTime?: number;
  onDismiss?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  // L'échec arrive avant le démarrage : remonter une scène sans sprite remet l'horloge à zéro.
  return <BattleScene key={failed ? 'fallback' : 'initial'} {...props}
    enemyArt={failed ? undefined : artwork} onArtworkError={fail} />;
}

function BattleScene({
  battle,
  onDismiss,
  enemyArt,
  introduction,
  onArtworkError,
  demo = false,
  demoTime,
}: {
  battle: Battle;
  enemyArt?: EnemyArtwork;
  introduction?: string;
  onArtworkError: () => void;
  demo?: boolean;
  demoTime?: number;
  /**
   * Sortir. Le composant dit **quand** le joueur veut partir, la route décide de ce que ça
   * veut dire — une animation ne connaît pas la pile de navigation.
   */
  onDismiss?: () => void;
}) {
  const timeline = useMemo(() => buildBattleTimeline(battle, { illustrated: !!enemyArt }), [battle, enemyArt]);
  const enemyName = enemyArt?.name ?? battle.enemy.name;
  const hasIntroduction = !!introduction?.trim();
  const hasEntrance = !!enemyArt || hasIntroduction;
  const [entrance, setEntrance] = useState<EntrancePhase>(hasEntrance ? 'loading' : 'combat');
  const started = useRef(false);
  const clock = useSharedValue(0);
  const skipping = useSharedValue(false);
  const reducedMotion = useReducedMotion();

  /**
   * La séquence est-elle arrivée au bout.
   *
   * Les changements React sont réservés aux étapes de l'entrée et à la fin. Aucune frame
   * d'animation ne passe par `setState`.
   */
  const [done, setDone] = useState(false);

  const verdict = timeline.beats[timeline.beats.length - 1];

  // La respiration peut durer jusqu'au toucher ; quitter l'atelier l'arrête aussi.
  useEffect(() => () => cancelAnimation(clock), [clock]);

  const speak = () => {
    if (!hasIntroduction) {
      setEntrance('combat');
      play();
      return;
    }
    setEntrance('dialogue');
    clock.set(0);
    if (reducedMotion === false) {
      clock.set(withRepeat(withTiming(1, { duration: combatMotion.breathPeriod, easing: Easing.linear }), -1));
    }
  };

  const play = () => {
    if (skipping.get()) return;
    cancelAnimation(clock);
    setDone(false);
    clock.set(0);
    if (__DEV__ && demo && demoTime !== undefined) { clock.set(demoTime); return; }
    clock.set(withTiming(
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
    ));
  };

  const ready = () => {
    if (started.current) return;
    started.current = true;
    if (!hasEntrance) {
      play();
    } else if (!enemyArt || reducedMotion !== false) {
      speak();
    } else {
      setEntrance('entering');
      clock.set(-1);
      clock.set(withTiming(0, { duration: combatMotion.arrivalDuration, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(speak);
      }));
    }
  };

  /**
   * Le saut. Toucher l'écran amène à l'état final immédiatement.
   *
   * Il n'y a rien à calculer : poser l'horloge à la fin met chaque interpolation sur sa
   * dernière valeur, et ces dernières valeurs sont celles que le serveur a écrites.
   */
  const skip = () => {
    skipping.set(true);
    cancelAnimation(clock);
    clock.set(timeline.duration);
    setDone(true);
  };

  /**
   * Le geste unique de l'écran : **sauter tant qu'il reste à sauter, puis sortir**.
   *
   * C'est ce qu'un joueur fait sans qu'on le lui dise — il tape pour accélérer, il tape pour
   * partir. Le même geste que l'écran de récompense, pour la même raison.
   */
  const touch = () => {
    if (entrance === 'loading' || entrance === 'entering') return;
    if (entrance === 'dialogue') {
      setEntrance('combat');
      play();
      return;
    }
    if (done) {
      onDismiss?.();
      return;
    }

    skip();
  };

  // Le seul aller-retour vers JS de toute la séquence : un choc par coup **porté**. Les
  // esquives n'en déclenchent pas — rien n'a été encaissé, et vibrer dirait le contraire.
  useAnimatedReaction(
    () => countBlowsAt(timeline.blows, clock.value),
    (landed, previous) => {
      if (previous !== null && landed > previous && !skipping.get() && reducedMotion === false) {
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

  // L'entrée du cadre emprunte l'horloge métier déjà présente. Elle n'allonge ni ne décale
  // aucun battement; avec Réduire les animations — indéterminé compris — le panneau est posé.
  const frameEntryStyle = useAnimatedStyle(() => {
    if (hasEntrance || reducedMotion !== false) {
      return { opacity: 1, transform: [{ scale: 1 }] };
    }

    const entered = interpolate(
      clock.value,
      [0, duration.enter],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: entered,
      transform: [{ scale: scale.from + entered * (1 - scale.from) }],
    };
  });

  const spriteEntranceStyle = useAnimatedStyle(() => {
    if (!hasEntrance) return {};
    const motion = entranceMotionAt(entrance, clock.get(), reducedMotion !== false);
    return { top: `${motion.top}%`, bottom: `${motion.bottom}%`,
      opacity: entrance === 'combat' && clock.get() >= verdict.at ? 0 : motion.opacity,
      transform: [{ translateY: motion.y }, { scale: motion.scale }] };
  });
  const dialogueStyle = useAnimatedStyle(() => ({
    opacity: entranceMotionAt(entrance, clock.get(), reducedMotion !== false).dialogueOpacity,
  }));

  return (
    // Sans illustration, le layout lance la séquence. Avec un sprite, on attend aussi le
    // chargement des trois poses pour ne jamais jouer un coup avant son image.
    <Pressable style={styles.screen} onPress={touch} onLayout={enemyArt ? undefined : ready}
      testID={`battle-${entrance}`} accessibilityRole="button">
      <AmbientBackdrop />
      <Animated.View style={[styles.eventFrame, frameEntryStyle]} pointerEvents="none">
        <SystemFrame tier="event" style={styles.eventSurface} contentStyle={styles.eventContent}>
          <Fighter clock={clock} side="enemy" name={enemyName} ramps={timeline.enemy} stats={battle.enemy} />

          <View style={styles.stage}>
            {enemyArt && (
              <Animated.View style={[styles.spriteStage, actionsStyle, spriteEntranceStyle]}>
                <EnemySprite artwork={enemyArt} clock={clock} beats={timeline.beats}
                  pose={entrance === 'combat' ? undefined : 'idle'} onReady={ready} onError={onArtworkError} />
              </Animated.View>
            )}
            {hasIntroduction && entrance !== 'combat' && (
              <Animated.View style={[styles.dialogue, dialogueStyle]}
                accessibilityElementsHidden={entrance !== 'dialogue'}>
                <Text style={styles.speaker}>{enemyName.toUpperCase()}</Text>
                <Text style={styles.dialogueText}>{introduction}</Text>
                {entrance === 'dialogue' && <Text style={styles.dialogueHint}>Toucher pour combattre</Text>}
                <View style={styles.dialogueTail} />
              </Animated.View>
            )}
            {entrance === 'loading' && <Text style={styles.dialogueHint}>Préparation du combat…</Text>}
            <Animated.View style={[styles.layer, enemyArt && styles.spriteCalls, actionsStyle]}>
              <Call clock={clock} flash={timeline.enemy.damageFlash}>
                <Blow
                  clock={clock}
                  who={enemyName}
                  ramps={timeline.enemy}
                  tone={styles.dealt}
                />
              </Call>

              <Call clock={clock} flash={timeline.player.damageFlash}>
                <Blow clock={clock} who="Toi" ramps={timeline.player} tone={styles.taken} />
              </Call>

              <Call clock={clock} flash={timeline.enemy.dodgeFlash}>
                <Effect who={enemyName} effect="dodge" />
              </Call>

              <Call clock={clock} flash={timeline.player.dodgeFlash}>
                <Effect who="Toi" effect="dodge" />
              </Call>

              <Call clock={clock} flash={timeline.enemy.comboFlash}>
                <Effect who={enemyName} effect="combo" />
              </Call>

              <Call clock={clock} flash={timeline.player.comboFlash}>
                <Effect who="Toi" effect="combo" />
              </Call>
              <Call clock={clock} flash={timeline.enemy.replayFlash}><Effect who={enemyName} effect="replay" /></Call>
              <Call clock={clock} flash={timeline.player.replayFlash}><Effect who="Toi" effect="replay" /></Call>
            </Animated.View>

            <Animated.View style={[styles.layer, recapStyle]} pointerEvents="none">
              <Recap battle={battle} tally={timeline.tally} done={done} enemyName={enemyName} demo={demo} />
            </Animated.View>
          </View>

          <Fighter clock={clock} side="player" name="Toi" ramps={timeline.player} stats={battle.player} />
        </SystemFrame>
      </Animated.View>
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
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => {
    const lit = sampleRamp(flash, clock.value);

    return { opacity: lit, transform: [{ scale: reduced !== false ? 1 : scale.from + lit * (1 - scale.from) }] };
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
    const text = `-${Math.round(sampleRamp(ramps.damage, clock.value))}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  const absorbedProps = useAnimatedProps(() => {
    const text = `${Math.round(sampleRamp(ramps.mitigated, clock.value))} absorbés`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  // Éteinte quand il n'y a rien à absorber : « 0 absorbés » dirait le contraire de ce qui se
  // passe chez un combattant sans armure. La décision est dans la rampe, pas ici.
  const absorbedStyle = useAnimatedStyle(() => ({
    opacity: sampleRamp(ramps.mitigatedFlash, clock.value),
  }));

  const damageStyle = useAnimatedStyle(() => ({
    color: sampleRamp(ramps.criticalFlash, clock.value) > 0 ? combatEffects.critical : tone.color,
  }));
  const criticalStyle = useAnimatedStyle(() => ({ opacity: sampleRamp(ramps.criticalFlash, clock.value) }));
  const guardProps = useAnimatedProps(() => {
    const text = sampleRamp(ramps.guardFlash, clock.value) > 0
      ? `GARDE · −${Math.round(sampleRamp(ramps.guardReduction, clock.value))}` : '';
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });
  return (
    <View style={styles.call}>
      <Animated.View style={[styles.criticalEffect, criticalStyle]}><Effect effect="critical" /></Animated.View>
      <AnimatedTextInput
        editable={false}
        style={[styles.hit, damageStyle]}
        animatedProps={damageProps}
        defaultValue="0"
      />
      <Text style={styles.who} numberOfLines={1}>{who === 'Toi' ? 'TU ENCAISSES' : `${who.toUpperCase()} ENCAISSE`}</Text>
      <AnimatedTextInput editable={false} style={styles.absorbed} animatedProps={guardProps} defaultValue="" />
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

const EFFECTS = {
  dodge: { source: require('../../../assets/images/combat-effects/dodge.png'), label: 'ESQUIVE' },
  critical: { source: require('../../../assets/images/combat-effects/critical.png'), label: 'CRITIQUE !' },
  combo: { source: require('../../../assets/images/combat-effects/combo.png'), label: 'COMBO' },
  replay: { source: require('../../../assets/images/combat-effects/replay.png'), label: 'REJOUE !' },
} as const;

function Effect({ effect, who }: { effect: keyof typeof EFFECTS; who?: string }) {
  return <View style={styles.effect} pointerEvents="none">
    <Image source={EFFECTS[effect].source} style={StyleSheet.absoluteFill} contentFit="contain" />
    {who && <Text style={styles.who}>{who.toUpperCase()}</Text>}
    <Text style={[styles.effectLabel, { color: combatEffects[effect] }]}>{EFFECTS[effect].label}</Text>
  </View>;
}

/**
 * L'écran de fin.
 *
 * Il dit **ce qui s'est passé**, pas seulement qui a gagné. Les chiffres viennent du bilan de
 * `timeline.ts` — des sommes sur ce que le serveur a déjà envoyé, dont rien n'est accordé à
 * personne : voir le docblock de `BattleTally` pour la frontière avec la logique de jeu.
 *
 * ————— Le butin paraît ici, pas dans `timeline.ts` (#227) ——————————————————————————————
 *
 * Le bilan est déjà un **état** et non un passage : il paraît avec le verdict et y reste. Le
 * butin s'y range donc à côté du reste plutôt que d'ouvrir un battement de plus après le
 * verdict, ce qui allongerait un écran dont le budget a déjà été mesuré sur appareil
 * (`BUDGET`, quatorze secondes). `buildBattleTimeline` ne sait donc rien de `rewards` — le
 * composant le lit directement sur `battle`, une fois pour toutes.
 *
 * Les objets d'abord, les pièces ensuite : c'est l'ordre du contrat sur `BattleReward`, et le
 * back l'a aligné sur `RewardSummary` exprès pour que `ItemCard` et `CoinAmount`, déjà écrits
 * pour l'écran de récompense, se réutilisent tels quels ici.
 *
 * `hasBattleReward` tranche à elle seule ce qui paraît : une défaite, comme une victoire
 * tranchée par `max_attacks` sans KO, ne rapporte rien, et le back a refusé de dessiner une
 * consolation pour ce cas — ni bourse vide, ni « rien trouvé ».
 */
function Recap({ battle, tally, done, enemyName, demo }: {
  battle: Battle; tally: BattleTally; done: boolean; enemyName: string; demo: boolean;
}) {
  const won = battle.result === 'VICTORY';
  const reward = battle.rewards;
  // « avant → après » seulement si la bourse a bougé : sur un lot qui n'a fait tomber que du
  // loot sans pièces, écrire « 40 → 40 pièces » dirait un mouvement qui n'a pas eu lieu — même
  // idiome que le `Recap` de `SyncSummaryView`.
  const purseChanged = reward.coins.after > reward.coins.before;

  return (
    <View style={styles.recap}>
      <Text style={[styles.verdict, won ? styles.verdictWon : styles.verdictLost]}>
        {battleResultLabel[battle.result]}
      </Text>

      <Text style={styles.against} numberOfLines={2}>
        {battle.endReason === 'ATTACK_LIMIT' ? 'Limite atteinte face à' : won ? 'Tu as vaincu' : 'Tu es tombé face à'} {enemyName}
      </Text>

      {tally.lastBlow !== null && (
        <Text style={styles.lastBlow}>
          Coup fatal : {tally.lastBlow.damage} de dégâts
          {tally.lastBlow.by === 'PLAYER' ? ' — le tien' : ' — le sien'}
        </Text>
      )}

      <View style={styles.tally}>
        <Score label="Actions / tentatives" value={`${tally.actionCount} / ${tally.attackCount}`} />
        <Score label="Coups portés" value={String(tally.blowsLanded)} />
        <Score label="Dégâts infligés" value={String(tally.damageDealt)} />
        <Score label="Dégâts subis" value={String(tally.damageTaken)} />
        {/* Les trois lignes suivantes ne paraissent que si elles ont eu lieu : un « 0 esquive »
            occupe la place d'une information sans en être une. */}
        {tally.damageAbsorbed > 0 && (
          <Score label="Absorbés par ton armure" value={String(tally.damageAbsorbed)} />
        )}
        {tally.dodges > 0 && <Score label="Tes esquives" value={String(tally.dodges)} />}
        {tally.combos > 0 && <Score label="Tes combos" value={String(tally.combos)} />}
        {tally.hpLeft > 0 && <Score label="Vie restante" value={String(tally.hpLeft)} />}
      </View>

      {/* Le butin — objets puis bourse, dans l'ordre du contrat. Rien ne paraît sur une
          défaite ou un combat sans rapport : voir le docblock de `hasBattleReward`. */}
      {!demo && hasBattleReward(reward) && (
        <View style={styles.loot}>
          {reward.loot.map((item, position) => (
            <ItemCard key={`${item.key}-${position}`} item={item} />
          ))}

          <Score
            label="Bourse"
            value={
              purseChanged ? (
                <>
                  <CoinAmount amount={reward.coins.before} />
                  <Text style={styles.scoreValue}>→</Text>
                  <CoinAmount amount={reward.coins.after} />
                </>
              ) : (
                <CoinAmount amount={reward.coins.after} />
              )
            }
          />
        </View>
      )}

      {/* L'affordance de sortie ne paraît qu'à la fin : avant, le seul geste est le saut, et
          l'annoncer pendant la séquence inviterait à la manquer. */}
      {done && <Text style={styles.exit}>Touche pour revenir</Text>}
    </View>
  );
}

function Score({ label, value }: { label: string; value: React.ReactNode }) {
  const isText = typeof value === 'string' || typeof value === 'number';

  return (
    <View style={styles.score}>
      <Text style={styles.scoreLabel}>{label}</Text>
      {isText ? (
        <Text style={styles.scoreValue}>{value}</Text>
      ) : (
        <View style={styles.scoreValueRow}>{value}</View>
      )}
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
    width: `${(sampleRamp(ramps.hp, clock.value) / ramps.maxHp) * 100}%`,
  }));

  const powerProps = useAnimatedProps(() => {
    const text = `Puissance ${Math.round(sampleRamp(ramps.power, clock.value)) / 10} %`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });
  const hpProps = useAnimatedProps(() => {
    const text = String(
      Math.round(sampleRamp(ramps.hp, clock.value)),
    );
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <View style={styles.fighter}>
      <AnimatedTextInput editable={false} style={styles.absorbed} animatedProps={powerProps} defaultValue="Puissance 100 %" />
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
    padding: space.sm,
    overflow: 'hidden',
  },
  eventFrame: { flex: 1, zIndex: ambient.contentLayer },
  eventSurface: { flex: 1 },
  eventContent: {
    flex: 1,
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
  name: {
    ...type.title,
    color: color.text,
    fontFamily: typography.display.semibold,
    fontWeight: typography.display.weight.semibold,
  },
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
  spriteStage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: combatMotion.spriteBottom },
  spriteCalls: { top: combatMotion.callsTop },
  dialogue: { position: 'absolute', top: space.sm, left: 0, right: 0, padding: space.md,
    gap: space.sm, backgroundColor: color.surfaceRaised, borderRadius: radius.md,
    borderWidth: control.borderWidth, borderColor: color.accent },
  speaker: { ...type.label, color: color.accent },
  dialogueText: { ...type.body, color: color.text },
  dialogueHint: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  dialogueTail: { position: 'absolute', width: combatMotion.bubbleTailSize, height: combatMotion.bubbleTailSize,
    bottom: -combatMotion.bubbleTailSize / 2, left: combatMotion.bubbleTailLeft,
    transform: [{ rotate: combatMotion.bubbleTailRotation }], backgroundColor: color.surfaceRaised,
    borderBottomWidth: control.borderWidth, borderRightWidth: control.borderWidth, borderColor: color.accent },
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
  hit: {
    ...type.display,
    padding: 0,
    textAlign: 'center',
    fontFamily: typography.display.bold,
    fontWeight: typography.display.weight.bold,
  },
  /** Ce que le joueur inflige — la couleur de l'adversaire, puisque c'est lui qui l'encaisse. */
  dealt: { color: color.hpEnemy },
  taken: { color: color.hpPlayer },
  absorbed: { ...type.label, color: color.textMuted, padding: 0, textAlign: 'center' },
  word: {
    ...type.title,
    color: color.text,
    fontFamily: typography.display.semibold,
    fontWeight: typography.display.weight.semibold,
  },
  effect: { width: combatEffects.width, height: combatEffects.height, justifyContent: 'center', alignItems: 'center' },
  effectLabel: { ...type.title, fontSize: combatEffects.labelSize, fontFamily: typography.display.bold, textShadowColor: color.background, textShadowRadius: space.xs, textShadowOffset: { width: 0, height: control.borderWidth } },
  criticalEffect: { position: 'absolute', bottom: combatEffects.height - space.xl },

  recap: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.md },
  verdict: {
    ...type.display,
    textAlign: 'center',
    fontFamily: typography.display.bold,
    fontWeight: typography.display.weight.bold,
  },
  verdictWon: { color: color.victory },
  verdictLost: { color: color.defeat },
  against: { ...type.body, color: color.text, textAlign: 'center' },
  lastBlow: { ...type.label, color: color.textMuted, letterSpacing: 0, textAlign: 'center' },
  tally: { alignSelf: 'stretch', gap: space.xs, paddingTop: space.sm },
  loot: { alignSelf: 'stretch', gap: space.sm, paddingTop: space.sm },
  score: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  scoreLabel: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  scoreValue: { ...type.label, color: color.text, letterSpacing: 0 },
  scoreValueRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  exit: { ...type.label, color: color.textMuted, letterSpacing: 0, paddingTop: space.md },
});
