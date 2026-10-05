import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { hpBarFill, HpBar } from '@/components/HpBar';
import { ItemCard } from '@/components/ItemCard';
import {
  ambient,
  arena,
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
import { IMPACT } from './camera.ts';
import { DEFAULT_HERO, DEFAULT_OPPONENT, FighterSprite, type FighterArtwork } from './FighterSprite';
import { Stage } from './Stage';
import { enemyArtworkOf } from './enemyPresentation';
import { appearanceArtwork } from './appearances';
import { useAppearances } from './useAppearances';
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
 * Le duel occupe une arène latérale en paysage : joueur à gauche, adversaire à droite,
 * pieds sur le même sol. Les barres restent en haut ; les annonces s'affichent sous les
 * combattants. La résolution reste celle du serveur, sans commande de combat du joueur.
 *
 * Les dégâts et les effets restent auprès du combattant concerné. Le centre reste libre
 * jusqu'au bilan.
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
  enemyArt?: FighterArtwork;
  demo?: boolean;
  demoTime?: number;
  onDismiss?: () => void;
}) {
  // Un seul verrou pour la fenêtre : les orientations de la pile native entreraient
  // en concurrence avec celui-ci pendant la fermeture de la modale.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => { void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); };
  }, []);
  const catalog = useAppearances();
  const { artwork, hero } = useMemo(() => {
    const models = props.demo ? [] : catalog.data?.appearances ?? [];
    const player = appearanceArtwork(models, battle.player.appearance, 'back', 'Toi');
    const opponent = appearanceArtwork(models, battle.enemy.appearance, 'front', battle.enemy.name);
    // Les poses de base restent celles du catalogue ; les variantes de Murīd sont embarquées.
    if (player && battle.player.appearance === 'MURID') player.poses = { ...DEFAULT_HERO.poses, ...player.poses };
    if (opponent && battle.enemy.appearance === 'MURID') opponent.poses = { ...DEFAULT_OPPONENT.poses, ...opponent.poses };
    return {
      artwork: enemyArt ?? (battle.enemy.appearance
        ? opponent ?? { ...DEFAULT_OPPONENT, name: battle.enemy.name }
        : enemyArtworkOf(battle.enemy)),
      hero: player ?? DEFAULT_HERO,
    };
  }, [catalog.data, battle, enemyArt, props.demo]);
  if (!props.demo && catalog.isLoading) return <View style={styles.screen}><ActivityIndicator color={color.accent} /></View>;
  return <PresentedBattle key={battle.id} {...props} battle={battle} artwork={artwork} hero={hero}
    introduction={enemyArt?.introduction ?? battle.enemy.introduction ?? undefined} />;
}

function PresentedBattle({ artwork, ...props }: {
  battle: Battle;
  artwork?: FighterArtwork;
  hero: FighterArtwork;
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
  hero,
  introduction,
  onArtworkError,
  demo = false,
  demoTime,
}: {
  battle: Battle;
  enemyArt?: FighterArtwork;
  hero: FighterArtwork;
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
  const loaded = useRef(new Set<string>());
  const [heroFailed, setHeroFailed] = useState(false);
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
  /** ×1 ou ×2 : seule la durée restante change, l'horloge garde ses instants. */
  const [speed, setSpeed] = useState(1);

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
    run(speed);
  };

  const run = (rate: number) => {
    clock.set(withTiming(
      timeline.duration,
      { duration: Math.max(0, timeline.duration - clock.get()) / rate, easing: Easing.linear },
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

  const fighterReady = (side: string) => {
    loaded.current.add(side);
    if (loaded.current.has('player') && (!enemyArt || loaded.current.has('enemy'))) ready();
  };

  /**
   * Le saut. Toucher l'écran amène à l'état final immédiatement.
   *
   * Il n'y a rien à calculer : poser l'horloge à la fin met chaque interpolation sur sa
   * dernière valeur, et ces dernières valeurs sont celles que le serveur a écrites.
   */
  const toggleSpeed = () => {
    const next = speed === 1 ? 2 : 1;
    setSpeed(next);
    // Le rappel de l'animation annulée reçoit `finished: false` : il ne marque pas la fin.
    cancelAnimation(clock);
    run(next);
  };

  const skip = () => {
    skipping.set(true);
    cancelAnimation(clock);
    clock.set(timeline.duration);
    setDone(true);
  };

  /** Toucher démarre le dialogue ou passe au bilan ; son bouton sort sans gêner le défilement. */
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

  // Un effet sonore court se mêle à la musique du joueur et se tait avec l'interrupteur de
  // sonnerie : l'écran n'a pas de bouton de coupure, contrairement au raid.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
  }, []);
  const impactSound = useAudioPlayer(require('../../../assets/audio/alam/impact.wav'));
  const strike = useCallback((strength: number) => {
    if (reducedMotion === false) {
      void Haptics.impactAsync(strength > IMPACT.blow ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium)
        .catch(() => undefined);
    }
    void impactSound.seekTo(0).then(() => impactSound.play()).catch(() => undefined);
  }, [impactSound, reducedMotion]);

  // Le seul aller-retour vers JS de toute la séquence : un choc par coup **porté**, plus lourd
  // sur un critique ou le coup final. Les esquives n'en déclenchent pas — rien n'a été
  // encaissé, et vibrer dirait le contraire.
  useAnimatedReaction(
    () => countBlowsAt(timeline.blows, clock.value),
    (landed, previous) => {
      if (previous !== null && landed > previous && !skipping.get()) {
        scheduleOnRN(strike, timeline.impacts[landed - 1].strength);
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
    return { opacity: entrance === 'combat' && clock.get() >= verdict.at ? 0 : motion.opacity,
      transform: [{ translateY: motion.y }, { scale: motion.scale }] };
  });
  // Le héros entre avec le combat — pendant le dialogue, la scène appartient au mob — et
  // s'efface au verdict comme lui.
  const heroStyle = useAnimatedStyle(() => {
    if (entrance !== 'combat') return { opacity: 0 };
    const entered = reducedMotion !== false ? 1 : Math.min(1, Math.max(0, clock.get() / duration.enter));
    return { opacity: clock.get() >= verdict.at ? 0 : entered };
  });
  const dialogueStyle = useAnimatedStyle(() => ({
    opacity: entranceMotionAt(entrance, clock.get(), reducedMotion !== false).dialogueOpacity,
  }));

  return (
    // Les poses de chaque combattant doivent être prêtes avant le premier coup.
    <View style={styles.screen} testID={done ? `battle-${entrance}` : undefined}>
      <Image source={require('../../../assets/images/arenas/duel.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.eventFrame, frameEntryStyle]} pointerEvents="box-none">
        <View style={styles.eventContent}>
          <View style={styles.hud}>
            <Fighter clock={clock} side="player" name="Toi" ramps={timeline.player} stats={battle.player} />
            <Text style={styles.versus}>VS</Text>
            <Fighter clock={clock} side="enemy" name={enemyName} ramps={timeline.enemy} stats={battle.enemy} />
          </View>

          <Stage style={styles.stage} clock={clock} impacts={timeline.impacts} points={arena.impactPoint}
            effects={entrance === 'combat' && !done}
            combos={{ PLAYER: timeline.player.comboFlash, ENEMY: timeline.enemy.comboFlash }}>
            {enemyArt && (
              <Animated.View style={[styles.spriteStage, actionsStyle, spriteEntranceStyle]}>
                <FighterSprite artwork={enemyArt} clock={clock} beats={timeline.beats} lateral
                  signals={{ critical: timeline.player.criticalFlash, dodge: timeline.enemy.dodgeFlash,
                    combo: timeline.enemy.comboFlash, replay: timeline.enemy.replayFlash }}
                  pose={entrance === 'combat' ? undefined : 'idle'} onReady={() => fighterReady('enemy')} onError={onArtworkError} />
                <DamagePop clock={clock} ramps={timeline.enemy} tone={styles.dealt} />
                <FighterEffects clock={clock} ramps={timeline.enemy} />
              </Animated.View>
            )}
            {(
              <Animated.View style={[styles.heroStage, heroStyle]} pointerEvents="none">
                <FighterSprite key={heroFailed ? 'fallback' : 'hero'} artwork={heroFailed ? DEFAULT_HERO : hero} side="PLAYER" clock={clock} beats={timeline.beats} lateral
                  signals={{ critical: timeline.enemy.criticalFlash, dodge: timeline.player.dodgeFlash,
                    combo: timeline.player.comboFlash, replay: timeline.player.replayFlash }}
                  pose={entrance === 'combat' ? undefined : 'idle'} onReady={() => fighterReady('player')}
                  onError={() => { if (heroFailed) fighterReady('player'); else setHeroFailed(true); }} />
                <DamagePop clock={clock} ramps={timeline.player} tone={styles.taken} />
                <FighterEffects clock={clock} ramps={timeline.player} />
              </Animated.View>
            )}
            {!enemyArt && <Animated.View style={[styles.spriteStage, actionsStyle]}>
              <DamagePop clock={clock} ramps={timeline.enemy} tone={styles.dealt} />
              <FighterEffects clock={clock} ramps={timeline.enemy} />
            </Animated.View>}
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


            <Animated.View style={[styles.layer, recapStyle]} pointerEvents={done ? 'auto' : 'none'}>
              <ScrollView testID="battle-recap-scroll" style={styles.recapScroll} contentContainerStyle={styles.recapContent}>
                <Recap battle={battle} tally={timeline.tally} enemyName={enemyName} demo={demo} />
              </ScrollView>
              {done && <Pressable testID="battle-exit" accessibilityRole="button" onPress={touch} hitSlop={space.sm}>
                <Text style={styles.exit}>Touche pour revenir</Text>
              </Pressable>}
            </Animated.View>
          </Stage>

        </View>
      </Animated.View>
      {!done && <Pressable style={styles.touchSurface} onPress={touch} testID={`battle-${entrance}`}
        accessibilityRole="button" accessibilityLabel={entrance === 'dialogue'
          ? `${enemyName}. ${introduction}. Toucher pour combattre` : 'Passer au bilan'} />}
      {entrance === 'combat' && !done && demoTime === undefined && (
        <View style={styles.controls}>
          <Pressable onPress={toggleSpeed} style={[styles.control, speed === 2 && styles.controlOn]} hitSlop={space.sm}
            accessibilityRole="button" accessibilityLabel="Vitesse ×2" accessibilityState={{ selected: speed === 2 }}>
            <Text style={styles.controlLabel}>×2</Text>
          </Pressable>
          <Pressable onPress={skip} style={styles.control} hitSlop={space.sm} accessibilityRole="button">
            <Text style={styles.controlLabel}>Passer</Text>
          </Pressable>
        </View>
      )}
      </SafeAreaView>
    </View>
  );
}

/**
 * Le chiffre qui jaillit de la cible : il paraît au contact, monte sur son battement et s'éteint
 * avec l'éclat. Les effets restent eux aussi près du combattant concerné.
 */
function DamagePop({ clock, ramps, tone }: { clock: SharedValue<number>; ramps: SideRamps; tone: { color: string } }) {
  const reduced = useReducedMotion();
  const props = useAnimatedProps(() => {
    const text = `-${Math.round(sampleRamp(ramps.damage, clock.value))}`;
    return { text, defaultValue: text } as Partial<React.ComponentProps<typeof TextInput>>;
  });
  const style = useAnimatedStyle(() => {
    const critical = sampleRamp(ramps.criticalFlash, clock.value);
    return {
      opacity: sampleRamp(ramps.damageFlash, clock.value),
      color: critical > 0 ? combatEffects.critical : tone.color,
      transform: [
        { translateY: reduced !== false ? 0 : -sampleRamp(ramps.rise, clock.value) * combatMotion.popRise },
        { scale: 1 + critical * combatMotion.popCritical },
      ],
    };
  });
  return <AnimatedTextInput editable={false} pointerEvents="none" style={[styles.pop, style]}
    animatedProps={props} defaultValue="" accessible={false} />;
}

const EFFECTS = {
  dodge: { source: require('../../../assets/images/combat-effects/dodge.png'), label: 'ESQUIVE' },
  critical: { source: require('../../../assets/images/combat-effects/critical.png'), label: 'CRITIQUE !' },
  combo: { source: require('../../../assets/images/combat-effects/combo.png'), label: 'COMBO' },
  replay: { source: require('../../../assets/images/combat-effects/replay.png'), label: 'REJOUE !' },
} as const;

/** Les images existantes suivent la cible du critique ou l’acteur de l’esquive/combo. */
function FighterEffects({ clock, ramps }: { clock: SharedValue<number>; ramps: SideRamps }) {
  return <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {(['critical', 'dodge', 'combo', 'replay'] as const).map((effect) =>
      <FighterEffect key={effect} effect={effect} clock={clock} flash={ramps[`${effect}Flash`]} />)}
  </View>;
}

function FighterEffect({ effect, clock, flash }: { effect: keyof typeof EFFECTS; clock: SharedValue<number>; flash: Ramp }) {
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => {
    const lit = sampleRamp(flash, clock.get());
    return { opacity: lit, transform: [{ scale: reduced !== false ? 1 : scale.from + lit * (1 - scale.from) }] };
  });
  return <Animated.View style={[styles.fighterEffect, style]} pointerEvents="none">
    <Image source={EFFECTS[effect].source} style={StyleSheet.absoluteFill} contentFit="contain"
      accessibilityLabel={EFFECTS[effect].label} />
  </Animated.View>;
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
function Recap({ battle, tally, enemyName, demo }: {
  battle: Battle; tally: BattleTally; enemyName: string; demo: boolean;
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
 * Il ne porte plus que son **état** — dégâts et effets suivent son sprite. Il reçoit son camp
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

        {side === 'player' ? (
          <Text style={styles.stats} numberOfLines={1}>
            {stats.damage} dég. · {stats.mitigationPercent} % arm. · {stats.dodgePercent} % esq.
          </Text>
        ) : null}
      </View>
      {side === 'player' && <AnimatedTextInput editable={false} style={styles.absorbed} animatedProps={powerProps} defaultValue="Puissance 100 %" />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: color.background,
  },
  safe: { flex: 1 },
  eventFrame: { flex: 1, zIndex: ambient.contentLayer },
  eventContent: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  versus: { ...type.title, color: color.accent, paddingTop: space.sm },
  fighter: { gap: space.xs, width: arena.hudWidth, backgroundColor: arena.scrim, padding: space.sm, borderRadius: radius.sm },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  name: {
    ...type.body,
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

  /** L'arène accueille les combattants puis le bilan. */
  stage: { flex: 1, justifyContent: 'center' },
  spriteStage: { position: 'absolute', bottom: arena.groundBottom, right: arena.enemyRight, width: arena.fighterWidth, height: arena.fighterHeight },
  heroStage: { position: 'absolute', bottom: arena.groundBottom, left: arena.playerLeft, width: arena.fighterWidth, height: arena.fighterHeight },
  pop: { position: 'absolute', top: '22%', alignSelf: 'center', width: combatMotion.popWidth, padding: 0,
    ...type.title, textAlign: 'center', fontFamily: typography.display.bold, fontWeight: typography.display.weight.bold,
    textShadowColor: color.background, textShadowRadius: space.xs, textShadowOffset: { width: 0, height: control.borderWidth } },
  touchSurface: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: ambient.contentLayer },
  controls: { position: 'absolute', bottom: space.xs, alignSelf: 'center', flexDirection: 'row', gap: space.sm,
    zIndex: ambient.contentLayer + 1 },
  control: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill,
    borderWidth: control.borderWidth, borderColor: color.border, backgroundColor: color.surfaceRaised },
  controlOn: { borderColor: color.accent },
  controlLabel: { ...type.label, color: color.text, letterSpacing: 0 },
  dialogue: { position: 'absolute', bottom: space.sm, left: '25%', right: '25%', padding: space.md,
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
  dealt: { color: color.hpEnemy },
  taken: { color: color.hpPlayer },
  absorbed: { ...type.label, color: color.textMuted, padding: 0, textAlign: 'center' },
  word: {
    ...type.title,
    color: color.text,
    fontFamily: typography.display.semibold,
    fontWeight: typography.display.weight.semibold,
  },
  fighterEffect: { position: 'absolute', top: '40%', left: '15%', right: '15%', height: arena.effectHeight },

  recapScroll: { width: '100%', maxWidth: arena.recapWidth, backgroundColor: arena.scrim, borderRadius: radius.md },
  recapContent: { padding: space.md },
  recap: { alignItems: 'center', gap: space.xs },
  verdict: {
    ...type.title,
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
