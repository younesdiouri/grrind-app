import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
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
import { Button } from '@/components/Button';
import { hpBarFill, HpBar } from '@/components/HpBar';
import { ItemCard } from '@/components/ItemCard';
import {
  ambient,
  arena,
  battleResultLabel,
  color,
  combatMotion,
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
import { FighterSprite, type FighterArtwork } from './FighterSprite';
import { Stage } from './Stage';
import { combatEnemy, combatPlayer } from './combatCharacters';
import { BUNDLED_MOBS } from './bundledMobs';
import { entranceMotionAt, type EntrancePhase } from './entranceMotion';
import { UnityCombatStage, unityCombatAvailable } from './UnityCombatStage';
import { QUATERNIUS_AVATAR, type UnityAvatar, type UnityViewport } from './unityFrame';
import {
  buildBattleTimeline,
  sampleRamp,
  countBlowsAt,
  type Battle,
  type BattleTally,
  type SideRamps,
} from './timeline.ts';

/**
 * One presentation clock drives the server replay, Unity and native audio/haptics.
 * Unity renders the combat HUD, effects and finale; RN owns accessible controls,
 * the detailed recap and the illustrations still awaiting their 3D migration.
 */

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function BattleView({ battle, enemyArt, ...props }: {
  battle: Battle;
  enemyArt?: FighterArtwork;
  unityPlayer?: UnityAvatar;
  unityEnemy?: UnityAvatar;
  demo?: boolean;
  demoTime?: number;
  onDismiss?: () => void;
}) {
  // Un seul verrou pour la fenêtre : les orientations de la pile native entreraient
  // en concurrence avec celui-ci pendant la fermeture de la modale.
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => { void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); };
  }, []));
  const enemy = combatEnemy(battle.enemy, BUNDLED_MOBS);
  return <PresentedBattle key={battle.id} {...props} battle={battle}
    unityPlayer={props.unityPlayer ?? combatPlayer(battle.player)}
    unityEnemy={props.unityEnemy ?? enemy.avatar} artwork={enemy.avatar.visible ? undefined : enemyArt ?? enemy.artwork}
    introduction={enemyArt?.introduction ?? battle.enemy.introduction ?? undefined} />;
}

function PresentedBattle({ artwork, ...props }: {
  battle: Battle;
  artwork?: FighterArtwork;
  introduction?: string;
  unityPlayer?: UnityAvatar;
  unityEnemy?: UnityAvatar;
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
  unityPlayer,
  unityEnemy,
}: {
  battle: Battle;
  enemyArt?: FighterArtwork;
  unityPlayer?: UnityAvatar;
  unityEnemy?: UnityAvatar;
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
  const nativeEnemy = unityEnemy?.visible ?? Boolean(battle.enemy.appearance);
  const illustrated = !!enemyArt || nativeEnemy;
  const timeline = useMemo(() => buildBattleTimeline(battle, { illustrated }), [battle, illustrated]);
  const enemyName = enemyArt?.name ?? battle.enemy.name;
  const hasIntroduction = !!introduction?.trim();
  const hasEntrance = illustrated || hasIntroduction;
  const [entrance, setEntrance] = useState<EntrancePhase>(hasEntrance ? 'loading' : 'combat');
  const started = useRef(false);
  const loaded = useRef(new Set<string>());
  const [unityFailed, setUnityFailed] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  useEffect(() => {
    let current = true;
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
      current = false; setScreenReader(enabled);
    });
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (current) setScreenReader(enabled);
    }, () => undefined);
    return () => { current = false; subscription.remove(); };
  }, []);
  const useUnity = unityCombatAvailable && !unityFailed;
  const window = useWindowDimensions();
  const accessibleHud = screenReader || window.fontScale > 1.2;
  const [unityViewport, setUnityViewport] = useState<UnityViewport>({ x: 0, y: 0, width: 1, height: 1 });
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
  const [showDetails, setShowDetails] = useState(false);
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
    setShowDetails(false);
    clock.set(0);
    if (__DEV__ && demo && demoTime !== undefined) {
      clock.set(demoTime); setDone(demoTime >= timeline.duration); return;
    }
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
    if (done) {
      onDismiss?.();
      return;
    }
    if (entrance === 'loading' || entrance === 'entering') return;
    if (entrance === 'dialogue') {
      setEntrance('combat');
      play();
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
  const dialogueStyle = useAnimatedStyle(() => ({
    opacity: entranceMotionAt(entrance, clock.get(), reducedMotion !== false).dialogueOpacity,
  }));

  return (
    // Les poses de chaque combattant doivent être prêtes avant le premier coup.
    <View style={styles.screen} testID={done ? `battle-${entrance}` : undefined}>
      <Image source={require('../../../assets/images/arenas/duel.png')} style={StyleSheet.absoluteFill} contentFit="cover" />
      {useUnity && <UnityCombatStage clock={clock} timeline={timeline}
        player={unityPlayer ?? QUATERNIUS_AVATAR} enemy={{ ...(unityEnemy ?? QUATERNIUS_AVATAR), visible: nativeEnemy }}
        viewport={unityViewport} width={unityViewport.width * window.width} playing={entrance === 'combat'} done={done}
        hud={{ playerName: 'Toi', enemyName, playerHp: battle.player.hp, enemyHp: battle.enemy.hp,
          won: battle.result === 'VICTORY', limit: battle.endReason === 'ATTACK_LIMIT', hideHud: accessibleHud,
          coins: !demo && hasBattleReward(battle.rewards) ? battle.rewards.coins.gained : 0,
          loot: !demo && hasBattleReward(battle.rewards) ? battle.rewards.loot.length : 0 }}
        onReady={() => { fighterReady('player'); if (nativeEnemy) fighterReady('enemy'); }}
        onError={() => setUnityFailed(true)} />}
      <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.eventFrame, frameEntryStyle]} pointerEvents="box-none">
        <View style={styles.eventContent}>
          <View style={[styles.hud, useUnity && !accessibleHud && styles.unityHudSemantics]}>
            <Fighter clock={clock} side="player" name="Toi" ramps={timeline.player} stats={battle.player} />
            <Text style={styles.versus}>VS</Text>
            <Fighter clock={clock} side="enemy" name={enemyName} ramps={timeline.enemy} stats={battle.enemy} />
          </View>

          <Stage style={styles.stage} clock={clock} impacts={timeline.impacts} points={arena.impactPoint}
            onMeasure={useUnity ? ({ x, y, width, height }) => {
              const next = { x: x / window.width, y: 1 - (y + height) / window.height,
                width: width / window.width, height: height / window.height };
              setUnityViewport((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
            } : undefined}
            effects={!useUnity && entrance === 'combat' && !done}
            combos={{ PLAYER: timeline.player.comboFlash, ENEMY: timeline.enemy.comboFlash }}>
            {enemyArt && (
              <Animated.View style={[styles.spriteStage, actionsStyle, spriteEntranceStyle]}>
                <FighterSprite artwork={enemyArt} clock={clock} beats={timeline.beats} lateral
                  signals={{ critical: timeline.player.criticalFlash, dodge: timeline.enemy.dodgeFlash,
                    combo: timeline.enemy.comboFlash, replay: timeline.enemy.replayFlash }}
                  pose={entrance === 'combat' ? undefined : 'idle'} onReady={() => fighterReady('enemy')} onError={onArtworkError} />
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
            {useUnity && entrance === 'loading' && <Text style={styles.dialogueHint}>Préparation du combat…</Text>}


            {done && showDetails && <View style={[styles.layer, styles.details]}>
              <ScrollView testID="battle-recap-scroll" style={styles.recapScroll} contentContainerStyle={styles.recapContent}>
                <Recap battle={battle} tally={timeline.tally} enemyName={enemyName} demo={demo} />
              </ScrollView>
            </View>}

          </Stage>

        </View>
      </Animated.View>
      {done && <View style={styles.resultControls}>
        <Pressable testID="battle-details" accessibilityRole="button"
          accessibilityLabel={`${battleResultLabel[battle.result]}. Voir le bilan et le butin`}
          accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(!showDetails)} style={styles.control}>
          <Text style={styles.controlLabel}>{showDetails ? 'Revoir la scène' : 'Bilan et butin'}</Text>
        </Pressable>
        <Pressable testID="battle-exit" accessibilityRole="button" onPress={touch} style={[styles.control, styles.controlOn]}>
          <Text style={styles.controlLabel}>Continuer</Text>
        </Pressable>
      </View>}
      {!done && <Pressable style={styles.touchSurface} onPress={touch} testID={`battle-${entrance}`}
        accessibilityRole="button" accessibilityLabel={entrance === 'dialogue'
          ? `${enemyName}. ${introduction}. Toucher pour combattre` : 'Passer au bilan'} />}
      {!useUnity && !done && <View style={[StyleSheet.absoluteFill, styles.rendererNotice]} testID="battle-renderer-unavailable">
        <Text style={styles.rendererNoticeText}>Le rendu 3D est indisponible.</Text>
        <Button label="Voir le bilan" onPress={skip} />
      </View>}
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
/**
 * L'écran de fin.
 *
 * Il dit **ce qui s'est passé**, pas seulement qui a gagné. Les chiffres viennent du bilan de
 * `timeline.ts` — des sommes sur ce que le serveur a déjà envoyé, dont rien n'est accordé à
 * personne : voir le docblock de `BattleTally` pour la frontière avec la logique de jeu.
 *
 * Le panneau détaillé reste consultable après la finale Unity. Les fiches et la bourse
 * lisent la réponse serveur ; consulter ou rejouer un combat ne crédite jamais de gain.
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
  rendererNotice: { zIndex: ambient.contentLayer + 1,
    justifyContent: 'center', alignItems: 'center', gap: space.md, backgroundColor: color.background },
  rendererNoticeText: { ...type.body, color: color.textMuted },
  eventFrame: { flex: 1, zIndex: ambient.contentLayer },
  eventContent: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  unityHudSemantics: { opacity: 0 },
  resultControls: { position: 'absolute', bottom: space.sm, alignSelf: 'center', flexDirection: 'row', gap: space.sm, zIndex: ambient.contentLayer + 2 },
  details: { backgroundColor: arena.scrim, zIndex: ambient.contentLayer + 1, paddingBottom: space.xl },
  hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  versus: { ...type.title, color: color.accent, padding: space.sm,
    backgroundColor: arena.scrim, borderRadius: radius.sm },
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
  absorbed: { ...type.label, color: color.textMuted, padding: 0, textAlign: 'center' },
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

});
