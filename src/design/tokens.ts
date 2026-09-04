import type { components } from '@/api/schema';

/**
 * Les tokens du design system.
 *
 * **Source de vérité, sens unique.** Ces valeurs sont consommées par les composants React
 * Native, et les previews HTML poussées vers Claude Design en sont *dérivées* via
 * `react-native-web`. Jamais l'inverse : partir du CSS coûterait une traduction sur chaque
 * composant, à vie — React Native n'a ni cascade, ni `flexDirection: row` par défaut, ni
 * ombre portable.
 *
 * Aucune valeur en dur dans un composant. Si une valeur manque ici, elle s'ajoute ici.
 */

export const palette = {
  night: '#050816',
  slate: '#0B1124',
  steel: '#16213D',
  fog: '#8290AE',
  chalk: '#EAF6FF',
  /** L'accent est froid : l'action n'emprunte plus la chaleur de la pièce. */
  ember: '#35E4FF',
  /** Le blanc incandescent n'appartient qu'au palier et au légendaire. */
  gold: '#F7FCFF',
  mint: '#75FFB2',
  rust: '#FF5ACD',
  /** Force, dans le cercle de vie (#69). */
  amethyst: '#A98BFF',
  /** Endurance, dans le cercle de vie. */
  glacier: '#67D8FF',
  /** Mobilité, dans le cercle de vie. */
  lichen: '#C2FF6C',
  /** Dextérité, dans le cercle de vie. */
  blossom: '#FF79CE',
  /** La pièce, dans `color.coin` (#125). */
  copper: '#FFB454',
  /** Le reflet gravé de la pièce — distinct de l'or des niveaux. */
  copperLight: '#FFD18A',
  /** La lumière cyan ne devient un halo que via `glow`, jamais implicitement par `color`. */
  cyanHalo: 'rgba(53, 228, 255, 0.42)',
  /** Le vert conserve son halo propre pour les gains qui viennent d'arriver. */
  gainHalo: 'rgba(117, 255, 178, 0.48)',
  /** Le blanc ne rayonne qu'au moment du palier. */
  celebrateHalo: 'rgba(247, 252, 255, 0.72)',
} as const;

export const color = {
  background: palette.night,
  surface: palette.slate,
  surfaceRaised: palette.steel,
  text: palette.chalk,
  textMuted: palette.fog,
  /** L'XP gagnée, et l'accent du produit. */
  accent: palette.ember,
  /** Le niveau — la lumière blanche reste exceptionnelle. */
  celebrate: palette.gold,
  /**
   * La pièce — la bourse, le prix d'une carte d'objet, un mouvement du ledger. Jamais
   * `celebrate`, et c'est délibéré : l'or dit « le niveau et les titres — ce qui se célèbre »,
   * une bourse ne se célèbre pas, elle se **consulte**. Les deux se jouent parfois dans le
   * même écran — un niveau franchi, puis des pièces qui tombent, dans cet ordre, au bas d'un
   * `RewardSummary` — et une seule teinte pour les deux brouillerait la lecture de ce qui vient
   * de se produire deux fois. Même raison que `hpPlayer`/`hpEnemy` : un token propre, dont le
   * nom dit ce qu'il désigne, plutôt qu'un emprunt de sens.
   */
  coin: palette.copper,
  /** Le relief du pictogramme de monnaie. */
  coinHighlight: palette.copperLight,
  /** Une ligne de breakdown positive. */
  gain: palette.mint,
  /** Une ligne de breakdown négative : rendements décroissants, plafond quotidien. */
  loss: palette.rust,
  /** Le trait d'un champ de saisie, et toute séparation qui n'est pas une surface. */
  border: palette.steel,
  /** Un refus : saisie invalide, appel rejeté. Distinct de `loss`, qui parle d'XP. */
  danger: palette.rust,
  /** Un combat gagné. */
  victory: palette.mint,
  /**
   * Les points de vie, en combat. Deux couleurs et pas une, parce que les deux barres se
   * lisent **en même temps** : une seule teinte obligerait à retrouver laquelle est laquelle
   * à chaque coup, et le combat se joue trop vite pour ça.
   *
   * Le joueur prend la couleur de ce qui va bien, l'adversaire celle de la menace. C'est le
   * seul endroit de l'app où `rust` ne dit pas un refus mais un camp — d'où deux noms propres
   * plutôt qu'un emprunt à `danger` ou à `gain`, dont le sens ailleurs ne survivrait pas.
   */
  hpPlayer: palette.mint,
  hpEnemy: palette.rust,
  /**
   * Un combat perdu — et **surtout pas `danger`**.
   *
   * Une défaite n'est pas un refus : rien n'a mal tourné, l'app n'a rien à se reprocher, et
   * le joueur non plus. La peindre en rouge la rangerait avec les saisies invalides et les
   * appels rejetés, alors qu'elle appartient au jeu. Elle est donc **éteinte** plutôt
   * qu'alarmante : c'est arrivé, on y retourne.
   */
  defeat: palette.fog,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  pill: 999,
} as const;

/**
 * Les formes techniques n'écrasent pas les rayons fonctionnels : elles donnent un vocabulaire
 * propre aux commandes et panneaux système, tandis que cercles, jauges et pastilles gardent
 * `radius.pill`.
 */
export const control = {
  radius: 2,
  minHeight: 56,
  borderWidth: 1,
  accentWidth: 32,
  accentHeight: 2,
  backSize: 44,
} as const;

export const navigation = {
  iconSize: 24,
  markerSize: 6,
  markerOffset: -8,
  markerRotation: '45deg',
  headerHeight: 56,
} as const;

export const typography = {
  display: {
    semibold: 'Oxanium-SemiBold',
    bold: 'Oxanium-Bold',
    weight: { semibold: 600, bold: 700 },
  },
} as const;

/** Les trois degrés de hiérarchie d'un panneau, du module quotidien à l'événement. */
export const frame = {
  standard: {
    radius: 4,
    borderWidth: 1,
    inset: 0,
    accentLength: 28,
    double: false,
    glow: false,
  },
  hero: {
    radius: 4,
    borderWidth: 1,
    inset: 6,
    accentLength: 44,
    double: true,
    glow: false,
  },
  event: {
    radius: 2,
    borderWidth: 2,
    inset: 7,
    accentLength: 72,
    double: true,
    glow: true,
  },
  segmentThickness: 2,
  /**
   * Les segments se posent **au ras** du trait, pas dessus.
   *
   * Ils valaient `-1` et se lisaient à 1 px au lieu de 2 : `SystemFrame` pose `overflow: 'hidden'`
   * pour que le halo et les calques décoratifs restent dans le cadre, et un enfant absolu est
   * clippé à l'intérieur du trait — la moitié qui débordait n'a jamais été rendue. Personne ne
   * l'avait vu parce qu'un segment fin reste un segment ; `seam` (#159) fait respirer exactement
   * ces deux vues, et faire respirer un demi-segment aurait figé le défaut pour de bon.
   */
  segmentOffset: 0,
} as const;

/**
 * Le champ de télémétrie : trois rails seulement, tous issus de la même horloge. Les
 * positions et amplitudes sont des données afin que le composant ne choisisse aucune géométrie.
 */
export const ambient = {
  layer: -1,
  contentLayer: 1,
  cycle: 12_000,
  railWidth: 1,
  railHeight: 96,
  railOpacity: 0.34,
  gridGap: 48,
  gridLine: 1,
  rails: [
    { top: '-18%', left: '2%', distance: 700, phase: 0 },
    { top: '82%', left: '98%', distance: -680, phase: 0.34 },
    { top: '-12%', left: '4%', distance: 620, phase: 0.68 },
  ],
} as const;

/**
 * ————— Le mouvement de fond des panneaux ——————————————————————————————————————————————
 *
 * Le vocabulaire fini de ce qui bouge **sans qu'on y touche** (#159). Ce n'est pas la même
 * famille que `duration` : celle-là dit combien de temps une transition met à se jouer,
 * celle-ci dit à quel rythme un panneau a l'air d'être alimenté. Un HUD est crédible parce
 * qu'il mesure quelque chose en continu, pas parce qu'il est bien dessiné.
 *
 * **Tout ce qui est continu ici se lit sur l'horloge d'`AmbientBackdropProvider`** par une
 * phase et un modulo — voir `motionPhase.ts`. Les cycles sont donc des **diviseurs de
 * `ambient.cycle`**, sans quoi le mouvement saute à chaque tour de l'horloge partagée ;
 * `tokens.test.ts` le prouve, et c'est ce test qui empêche le saut de revenir en douce.
 * Ils s'écartent pour ça de la référence de design, dont les cycles étaient libres.
 *
 * Seul `scan` échappe à la règle : c'est un **événement** — au montage, au rafraîchissement —
 * et il garde sa propre valeur partagée. Il n'a donc pas de `cycle` du tout, seulement la
 * durée de sa course.
 *
 * **Ces durées sont à mesurer sur un iPhone physique** avant d'être considérées comme justes,
 * exactement comme celles de `duration` : elles sortent d'une référence jouée sur un écran de
 * Mac, et un balayage juste là-bas est probablement trop rapide sur l'appareil.
 */
export const motion = {
  /** Un cadre qu'on vient de lire : un trait qui le traverse une fois, puis se tait. */
  scan: { active: 1_400, thickness: 1, opacity: 0.85 },
  /**
   * Un panneau alimenté : les deux segments respirent en **opposition de phase**.
   *
   * Amplitude minuscule, cycle long — on ne le regarde pas, on le sent. Chaque panneau prend
   * son propre décalage pour que les trois ne clignotent pas ensemble ; c'est le décalage qui
   * fait lire trois instruments plutôt qu'une seule pulsation d'écran.
   */
  seam: {
    cycle: 3_000,
    from: 0.45,
    to: 1,
    /** Le segment bas est à un demi-cycle du haut : c'est ça, l'opposition de phase. */
    opposite: 1_500,
    phase: { level: 0, ring: -800, bag: -2_100 },
  },
  /** La texture du bord intérieur gauche : un ruban de graduations qui dérive vers le haut. */
  tick: { cycle: 2_400, pitch: 9, dash: 3, width: 2, opacity: 0.45, inset: 12, margin: 14 },
  /**
   * La couronne du cadran : un cercle pointillé posé **à l'extérieur** des arcs, qui tourne
   * lentement dans le sens anti-horaire.
   *
   * `inset` est son écart au rayon net. Il agrandit le viewport SVG exactement comme le débord
   * d'un halo, et par le même mécanisme (`ringGeometry`) : le centre se décale de la moitié du
   * débord pour que les arcs gardent leur rayon, leur dash et leur offset.
   *
   * **`cycle` est le temps qu'un tiret met à prendre la place du suivant**, et non celui d'un
   * tour. C'est la seule période réellement visible d'un pointillé qui dérive : rien ne
   * distingue le tiret n° 1 du n° 51, et un tour complet — 24 s environ à ce rayon, ce que la
   * référence demande — n'est donc pas une période au sens de l'horloge partagée. Le prendre
   * pour tel imposerait un cycle de 24 000 ms, qui *multiplie* `ambient.cycle` au lieu de le
   * diviser : la couronne sauterait d'un demi-tour toutes les douze secondes.
   */
  orbit: { cycle: 480, inset: 16, width: 1, dash: 2, gap: 8, opacity: 0.55 },
  /**
   * Le secteur du cadran : il tourne **plus vite et dans l'autre sens** que la couronne, sous
   * les arcs. Les deux sens opposés sont l'essentiel de l'effet — c'est ce qui fait lire un
   * mécanisme plutôt qu'une image qui tourne.
   *
   * `steps` est le nombre de sous-secteurs d'opacité décroissante qui approchent le dégradé
   * conique du bord d'attaque : ni React Native ni SVG n'en ont un.
   */
  sweep: { cycle: 6_000, wedge: 84, diameter: 132, opacity: 0.3, steps: 6 },
  /**
   * L'énergie dans la jauge : une hachure sombre et un reflet clair **en parallaxe**, plus une
   * arête au front d'onde. Les deux couches parcourent leur propre pas en un cycle — le reflet
   * va donc dix fois plus vite que la hachure, et c'est ce décalage qui fait le conduit.
   *
   * L'arête se pose **au bord du remplissage**, à l'intérieur du masque : jamais dans la piste,
   * sinon elle clignoterait sur du vide quand la barre repart de zéro.
   */
  flow: {
    cycle: 1_000,
    sheen: 70,
    /** Le reflet est un dégradé, que React Native n'a pas : `sheenSteps` bandes l'approchent. */
    sheenSteps: 4,
    sheenOpacity: 0.5,
    hatch: 7,
    hatchWidth: 2,
    hatchOpacity: 0.24,
    /** L'inclinaison des deux couches, en degrés d'écart à la verticale. */
    slant: -10,
    crest: 2,
    crestCycle: 1_500,
    crestFrom: 0.4,
    crestTo: 1,
  },
  /** Les chevrons qui défilent en cascade sur un intitulé : le texte a l'air écrit par la machine. */
  convey: { cycle: 1_500, travel: 5, stagger: 250, count: 2 },
  /** Le curseur de l'en-tête, clignotement franc : il est allumé, puis il ne l'est plus. */
  caret: { cycle: 1_000, width: 5, height: 13 },
  /**
   * La ponctuation qu'on voit sur **tous** les écrans : le losange de l'onglet actif qui bat, et
   * le segment lumineux qui parcourt un filet. Un battement lent y suffit à dire que l'app
   * tourne, même sur un écran vide.
   *
   * `cycle` est celui du battement, `travel` celui de la course sur le filet, `spark` la
   * longueur du segment qui court.
   */
  beacon: {
    cycle: 2_000,
    travel: 6_000,
    spark: 26,
    from: 0.55,
    to: 1,
    scaleFrom: 0.8,
    scaleTo: 1.2,
    /**
     * Les trois filets de l'app sont visibles ensemble sur l'accueil. Sans déphasage, trois
     * points partiraient au même instant et l'écran clignoterait d'un bloc au lieu de mesurer
     * en trois endroits.
     */
    phase: { header: 0, section: -2_000, tabs: -4_000 },
  },
} as const;

/**
 * Les trois intensités de lumière autorisées.
 *
 * Les chaînes `boxShadow` restent ici — et non dans les composants — pour que la lumière
 * demeure un vocabulaire fini. `spread` ne sert qu'au tracé SVG extérieur : sa géométrie,
 * elle, reste calculée avec l'épaisseur nette de l'arc.
 */
export const glow = {
  /** Allume un trait ou une porte sans lui donner le rôle d'un événement. */
  soft: {
    boxShadow: `0 0 12px 0 ${palette.cyanHalo}`,
    textShadowColor: palette.cyanHalo,
    textShadowRadius: 8,
    spread: 4,
    opacity: 0.52,
  },
  /** Signale qu'un gain ou un total vient de se produire. */
  lit: {
    boxShadow: `0 0 18px 1px ${palette.gainHalo}`,
    textShadowColor: palette.gainHalo,
    textShadowRadius: 12,
    spread: 6,
    opacity: 0.64,
  },
  /** Reste réservé au niveau : le reste de l'interface ne peut pas le banaliser. */
  flare: {
    boxShadow: `0 0 24px 2px ${palette.celebrateHalo}`,
    textShadowColor: palette.celebrateHalo,
    textShadowRadius: 16,
    spread: 8,
    opacity: 0.78,
  },
} as const;

export const type = {
  display: { fontSize: 56, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6 },
  /**
   * Un code d'invitation : huit caractères qui se dictent à voix haute et se recopient
   * depuis une capture d'écran. `letterSpacing` est volontairement large — c'est lui qui
   * sépare visuellement des glyphes qu'une police système resserrerait. La police elle-même
   * (`Menlo` / `monospace`) reste au composant : elle dépend de la plateforme, et ce fichier
   * se lit aussi depuis Node, où `react-native` n'existe pas.
   */
  code: { fontSize: 28, fontWeight: '700', letterSpacing: 6 },
} as const;

/**
 * Ce qui varie sans qu'on y touche : l'opacité d'un élément selon son état.
 *
 * Un appui et une inertie ne se disent pas par une couleur — il y en aurait une par surface —
 * mais par un voile sur la couleur déjà là.
 */
export const opacity = {
  /** Le doigt est posé dessus. */
  pressed: 0.7,
  /** L'élément est là mais ne répond pas : occupé, ou désactivé. */
  inert: 0.5,
} as const;

/**
 * ————— Le mouvement ——————————————————————————————————————————————————————————————————
 *
 * **Ces durées sont mesurées, pas choisies.** Elles sortent du spike (#4), joué sur un
 * iPhone physique : le simulateur ment sur la performance, et une durée trouvée à l'œil sur
 * un Mac se révèle molle ou hachée sur l'appareil. C'est pour ça que ce ticket vient après.
 *
 * Elles sont ici et pas dans le séquenceur parce qu'elles ne parlent pas de récompense :
 * `settle` est le temps qu'une carte met à se poser, que ce soit une séance ou autre chose.
 * `timeline.ts` compose sa mise en scène **avec** cette échelle ; il n'en invente pas une.
 */
export const duration = {
  /** Le retour d'appui. Ce qui ne doit pas se remarquer. */
  tap: 120,
  /** Un détail qui paraît : un badge, un chiffre. */
  glint: 150,
  /** Un bloc qui cède la place au suivant. */
  handoff: 180,
  /** Ce qui se pose en prenant son échelle. */
  pop: 200,
  /** Une ligne de breakdown, et les suivantes à sa suite. */
  line: 260,
  /** Une entrée qui vient du bas. */
  enter: 320,
  /** Le temps de respirer avant que l'écran redevienne interactif. */
  breath: 360,
  /** Une carte qui se referme, une barre qui finit sa course. */
  settle: 420,
  /** Une liste qui se déplie. */
  unfold: 520,
  /** Un niveau qui bascule. */
  flip: 620,
  /** Un titre qui tombe. Rare, donc il prend son temps. */
  drop: 700,
} as const;

/**
 * Les courbes, en **points de contrôle d'une bézier cubique** — la forme de CSS, pas un
 * objet Reanimated.
 *
 * Deux raisons, et la seconde est la vraie. D'abord, ces tokens se lisent aussi depuis Node
 * quand les previews se construisent : importer Reanimated ici les casserait. Ensuite, une
 * courbe *est* quatre nombres ; l'objet qui l'applique est un détail de la plateforme qui
 * l'anime. `Easing.bezierFn(...curve.enter)` du côté React Native, `cubic-bezier(…)` du côté
 * preview, et c'est la même courbe des deux côtés parce qu'elle n'est écrite qu'une fois.
 */
export const curve = {
  /** Ce qui entre : parti vite, posé sans rebond. */
  enter: [0.16, 1, 0.3, 1],
  /** Ce qui se célèbre : dépasse, puis revient. Le dépassement est dans la courbe, pas dans
   *  une rampe à trois points recopiée d'un composant à l'autre. */
  celebrate: [0.34, 1.4, 0.64, 1],
} as const;

/** De combien une entrée se déplace avant de se poser, en points. */
export const travel = {
  /** Une ligne qui glisse depuis la droite. */
  slide: 16,
  /** Un bloc qui monte depuis le bas. */
  rise: 18,
  /** Un titre qui tombe depuis le haut. */
  drop: 24,
} as const;

/**
 * Les échelles du mouvement.
 *
 * `from` est le point de départ de ce qui apparaît en grandissant ; le dépassement, lui,
 * vient de `curve.celebrate` et non d'une valeur. `glint` est l'à-peine-perceptible : ce
 * qu'un élément déjà en place gagne au moment où quelque chose lui arrive.
 */
export const scale = { from: 0.7, glint: 1.07 } as const;

/**
 * Le vocabulaire des sources d'XP, rendu lisible.
 *
 * Le serveur envoie l'enum, pas la phrase — il n'a aucune raison de connaître la langue de
 * l'écran. La clé du `Record` est **l'union du schéma généré**, jamais une union recopiée :
 * c'est ce qui fait casser la compilation le jour où le back ajoute une source, au lieu de
 * laisser un `undefined` traverser jusqu'à l'écran. `DISTANCE` et `ELEVATION` sont arrivées
 * comme ça, avec le virage santé.
 */
export const xpSourceLabel: Record<components['schemas']['XpLine']['source'], string> = {
  BASE: 'Effort',
  DISTANCE: 'Distance',
  ELEVATION: 'Dénivelé',
  STREAK: 'Série',
  ITEM: 'Équipement',
  SKILL: 'Compétence',
  LEAGUE: 'Ligue',
  // « Guilde », jamais « Risāla » : l'enum désigne le mécanisme, pas la seule Risāla de la
  // semaine. Une unique valeur porte tout ce qu'un groupe apportera à côté d'elle — nommer
  // la première arrivée figerait un mensonge daté dès que la deuxième source de crédit de
  // guilde apparaîtrait, sans que rien dans le breakdown ne les distingue.
  GUILD: 'Guilde',
  DIMINISHING: 'Rendements décroissants',
  DAILY_CAP: 'Plafond quotidien',
};

/**
 * Pourquoi une séance n'a rien rapporté, alors qu'elle a bien été créditée.
 *
 * **Ce n'est pas un écart.** `skipReasonLabel` parle des séances que le serveur a refusé de
 * compter ; celle-ci parle d'une séance **comptée**, présente dans `imported`, avec sa carte
 * et sa ligne d'historique — mais dont la discipline ne rapporte pas d'XP par conception.
 *
 * Le serveur aurait pu envoyer un `breakdown` vide, ou une ligne « base : 0 ». Il a refusé de
 * mentir sur un calcul qui n'a jamais eu lieu et envoie une `reason` à la place : c'est une
 * phrase qu'il nous demande d'écrire, et la voici.
 *
 * Même garde-fou que les trois tables au-dessus : la clé sort de l'union du schéma, jamais
 * d'un test sur `discipline === 'WALKING'`. Le jour où une deuxième discipline rejoint la
 * marche, il n'y a rien à changer ici — et le jour où le back ouvre une deuxième raison, le
 * compilateur le dit.
 */
export const xpNoCreditReasonLabel: Record<
  NonNullable<components['schemas']['RewardSummary']['xp']['reason']>,
  string
> = {
  NO_XP_FEEDS_VITALITY: 'Ne rapporte pas d’XP · nourrit ta Vitalité',
};

/**
 * Les disciplines, rendues lisibles. Même garde-fou, même raison : `WALKING`, `HIIT` et
 * `HIKING` sont entrées au contrat avec le virage santé, et c'est le compilateur qui l'a dit.
 * Les trois sports collectifs de `grrind-back#166` sont arrivés de la même façon.
 *
 * **Les deux dernières nomment une famille, pas un sport**, et c'est le contrat qui le veut :
 * la table de correspondance est serveur, ce qui permet d'ouvrir le padel ou le squash sans
 * republier le client. Écrire « Tennis » ici rendrait faux l'affichage d'une séance de
 * badminton le jour où le back la range au même endroit.
 */
export const disciplineLabel: Record<components['schemas']['Discipline'], string> = {
  RUNNING: 'Course',
  WALKING: 'Marche',
  CYCLING: 'Vélo',
  SWIMMING: 'Natation',
  STRENGTH: 'Musculation',
  HIIT: 'Fractionné',
  HIKING: 'Randonnée',
  MOBILITY: 'Mobilité',
  CLIMBING: 'Escalade',
  FOOTBALL: 'Football',
  COURT_SPORTS: 'Sports de terrain',
  RACKET_SPORTS: 'Sports de raquette',
};

/**
 * Le contrat n'a pas d'enum `Attribute` : les caractéristiques sont des clés d'objet. Deux
 * formes, pas une, et c'est le contrat qui le décide — un **passage** (`RewardSummary`,
 * `XpTransaction`, avec `gained` ou un montant signé) et un **état** (`Progression`, `Player`,
 * à plat).
 *
 * Les quatre qui reçoivent de l'XP. `XpTransaction` est le seul schéma qui les porte sans
 * Vitality : elle n'est jamais créditée directement, aucune transaction ne lui est adressée.
 */
export type Attribute = keyof components['schemas']['XpTransaction']['attributes'];

/** Les cinq, Vitality comprise — l'état affiché après l'animation comme sur le profil d'un tiers. */
export type AttributeState = keyof components['schemas']['Progression']['attributes'];

/**
 * Les caractéristiques, rendues lisibles. Même garde-fou, même raison que `xpSourceLabel` et
 * `disciplineLabel` : la clé sort du schéma généré, jamais d'une union recopiée, et le
 * compilateur casse le jour où le back en ajoute une sixième.
 */
export const attributeLabel: Record<AttributeState, string> = {
  strength: 'Force',
  endurance: 'Endurance',
  mobility: 'Mobilité',
  dexterity: 'Dextérité',
  vitality: 'Vitalité',
};

/**
 * Les couleurs des quatre caractéristiques qui reçoivent de l'XP — `Attribute`, jamais
 * `AttributeState` : Vitality n'a **pas** de couleur, et c'est délibéré (#69). Les quatre
 * teintes disent « voici les parts » ; lui en donner une cinquième rendrait la légende fausse
 * pour ce qui n'en a aucune. Sa place est `color.text`, la couleur de ce qui se lit — voir
 * `AttributeRing`.
 *
 * Même garde-fou que `attributeLabel` : la clé sort du schéma généré, et franches, éloignées
 * les unes des autres, aucune de ces quatre ne doit se confondre avec `color.accent` (l'XP),
 * `color.celebrate` (le niveau), `color.gain`/`color.loss` (le breakdown) ou `color.danger`
 * (un refus) — cinq vocabulaires de couleur qui ne se recouvrent jamais.
 */
export const attributeColor: Record<Attribute, string> = {
  strength: palette.amethyst,
  endurance: palette.glacier,
  mobility: palette.lichen,
  dexterity: palette.blossom,
};

/**
 * Le cercle de vie (#69) : deux tailles, comme `XpBar`. Le rayon et l'épaisseur de trait sont
 * choisis ensemble — l'un ne se lit pas sans l'autre, un trait trop fin sur un grand rayon
 * paraîtrait flottant, trop épais sur un petit il mangerait le centre où Vitality se lit.
 */
export const ring = {
  radius: { inline: 26, hero: 64 },
  strokeWidth: { inline: 8, hero: 14 },
  /**
   * L'écart visible entre deux arcs — le même vocabulaire que le reste des espacements, pas un
   * angle choisi à l'œil. `AttributeRing` le convertit en longueur d'arc à l'affichage.
   */
  gap: space.xs,
} as const;

/**
 * Pourquoi une séance n'a rien rapporté.
 *
 * Le serveur nomme **chaque** séance écartée — `externalId`, `activityType`, `reason` — et
 * ce n'est pas de la courtoisie : une activité qui disparaît sans un mot est un bug du
 * point de vue du joueur, même quand l'écarter est le comportement voulu. Ces cinq phrases
 * sont le seul endroit où le client tient sa part de ce contrat.
 *
 * Elles sont écrites **du point de vue de la séance**, pas du serveur : « trop courte pour
 * compter » plutôt que « durée inférieure au minimum ». Le joueur n'a pas à connaître le
 * plancher pour comprendre qu'il l'a raté.
 */
export const skipReasonLabel: Record<
  components['schemas']['SyncSummary']['skipped'][number]['reason'],
  string
> = {
  ALREADY_IMPORTED: 'déjà comptée',
  UNSUPPORTED_ACTIVITY: 'pas encore un sport chez nous',
  OUT_OF_WINDOW: 'trop ancienne pour rapporter, mais gardée',
  OVERLAPS: 'déjà couverte par une autre séance',
  TOO_SHORT: 'trop courte pour compter',
};

/**
 * Les catégories de notification, rendues lisibles — le seul endroit où `reglages.tsx` écrit
 * une catégorie à la main (#57).
 *
 * **`Partial`, contrairement aux tables ci-dessus, et c'est volontaire.** `reglages.tsx`
 * n'itère jamais sur `NotificationCategory` : il rend chaque clé de
 * `UserProfile.notificationPreferences`, la map complète que le serveur envoie — une
 * catégorie ajoutée côté back doit apparaître sans republier le client. Une clé absente
 * d'ici retombe donc sur elle-même, brute, plutôt que de disparaître de l'écran.
 */
export const notificationCategoryLabel: Partial<
  Record<components['schemas']['NotificationCategory'], string>
> = {
  GUILD_ACTIVITY: 'Activité de guilde',

  // Les deux Risālāt (younesdiouri/grrind-back#194) restent séparées côté serveur : on peut
  // vouloir couper le bavardage de sa guilde sans couper ce qui nous demande d'agir. Les deux
  // libellés doivent rendre cette différence lisible, sinon la séparation ne sert à rien ici.
  //
  // Des groupes nominaux, comme « Activité de guilde » juste au-dessus : ces libellés
  // s'alignent sous un interrupteur et se lisent en liste. Une phrase — « C'est ton tour de
  // choisir » — se lirait comme la notification elle-même, pas comme le réglage qui la coupe.
  RISALA_TURN: 'Ton tour de Risāla',
  RISALA_REVEALED: 'Risāla révélée',
};

/**
 * L'issue d'un combat, en un mot.
 *
 * Même garde-fou que `xpSourceLabel` et les autres : la clé sort de l'union du schéma généré,
 * jamais d'une union recopiée. `BattleResult` est fermé à **deux** cas côté serveur et la
 * colonne est `NOT NULL` — un combat interrompu par `max_turns` est tranché au meilleur ratio
 * de points de vie, parce qu'un match nul n'a pas de mise en scène
 * (younesdiouri/grrind-back#209). Il n'y a donc pas de troisième état à dessiner, et le jour
 * où il y en aurait un, ce `Record` casserait la compilation avant que l'écran ne l'invente.
 */
export const battleResultLabel: Record<components['schemas']['BattleSummary']['result'], string> = {
  VICTORY: 'Victoire',
  DEFEAT: 'Défaite',
};

/**
 * La rareté d'un objet — cinq crans, `COMMON` à `LEGENDARY`. Le contrat ne la nomme pas comme
 * un schéma à part : c'est un littéral porté par `DroppedItem`, comme `Attribute` l'est par
 * `XpTransaction`. L'alias évite de retaper le chemin dans chaque composant qui la lit.
 */
export type ItemRarity = components['schemas']['DroppedItem']['rarity'];

/** Les sept emplacements où un équipement se porte. Les coffres n'en ont pas. */
export type EquipmentSlot = NonNullable<components['schemas']['DroppedItem']['slot']>;

/** Les treize effets qu'un modificateur peut porter, mêmes garde-fous que `ItemRarity`. */
export type ModifierType = components['schemas']['DroppedItemModifier']['type'];

/**
 * La rareté, en couleur — la seule information qu'une carte d'objet donne **avant** le nom.
 * Cinq teintes déjà présentes dans la palette, choisies pour rester distinctes entre elles sur
 * `color.background` : `fog` pour ce qui ne vaut pas la peine de s'arrêter, `mint` et
 * `glacier` et `amethyst` pour les trois crans intermédiaires — trois hues déjà éloignées les
 * unes des autres, empruntées au cercle de vie où elles jouent le même rôle de distinction à
 * l'œil — et `gold` pour `LEGENDARY`, la même teinte que `color.celebrate` : un objet
 * légendaire se célèbre comme un niveau franchi.
 *
 * Même garde-fou que les tables ci-dessus : la clé sort de l'union portée par `DroppedItem`,
 * jamais recopiée, et le compilateur casse le jour où le back ouvre un sixième cran.
 */
export const rarityColor: Record<ItemRarity, string> = {
  COMMON: palette.fog,
  UNCOMMON: palette.mint,
  RARE: palette.glacier,
  EPIC: palette.amethyst,
  LEGENDARY: palette.gold,
};

/** La rareté, rendue lisible. Même garde-fou, même raison que `rarityColor`. */
export const rarityLabel: Record<ItemRarity, string> = {
  COMMON: 'Commun',
  UNCOMMON: 'Peu commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
};

/** L'emplacement d'un objet, rendu lisible. Même garde-fou, même raison que `rarityLabel`. */
export const equipmentSlotLabel: Record<EquipmentSlot, string> = {
  HEAD: 'Tête',
  CHEST: 'Torse',
  HANDS: 'Mains',
  LEGS: 'Jambes',
  FEET: 'Pieds',
  ACCESSORY: 'Accessoire',
  WEAPON: 'Arme',
};

/**
 * Le nom d'un effet de modificateur — pas sa valeur, qui a une unité par type et se met en
 * phrase dans `formatModifier` (`features/inventory/format.ts`). `ModifierType` est un
 * vocabulaire de domaine partagé par cinq consommateurs, pas une chaîne d'affichage : le nom
 * de l'objet arrive traduit du serveur, celui de son effet non, et c'est le même cas que
 * `XpLine.source` ou `AttributeKey`.
 *
 * `UNLOCK_SESSION_TYPE` : aucun objet livré n'en porte encore, mais le type est ouvert côté
 * contrat et le `Record` doit le nommer — même raison que `insufficient-coin-balance` dans
 * `problems.ts`, qui se traduit pour un cas qu'aucun appel ne provoque encore.
 */
export const modifierLabel: Record<ModifierType, string> = {
  XP_MULTIPLIER: 'XP',
  LOOT_LUCK: 'Chance de butin',
  STREAK_SHIELD: 'Bouclier de série',
  UNLOCK_SESSION_TYPE: 'Nouveau type de séance',
  STRENGTH_BONUS: 'Force',
  ENDURANCE_BONUS: 'Endurance',
  MOBILITY_BONUS: 'Mobilité',
  DEXTERITY_BONUS: 'Dextérité',
  HP_BONUS: 'Points de vie',
  DAMAGE_BONUS: 'Dégâts',
  MITIGATION_BONUS: 'Mitigation',
  EXTRA_TURN_BONUS: 'Tour supplémentaire',
  DODGE_BONUS: 'Esquive',
};

/**
 * La raison d'un mouvement du ledger de pièces (#129), rendue lisible.
 *
 * Même garde-fou que `xpSourceLabel` et les autres : la clé sort de l'union portée par
 * `CoinTransaction.reason`, jamais recopiée — le compilateur doit casser quand `PURCHASE` et
 * `CHEST` entreront au lot 6b, « sans migration » selon le back
 * (younesdiouri/grrind-back#225). Une pièce se consulte, sa provenance aussi : la table dit
 * *ce qui* a produit l'écriture, jamais *combien*, qui vient de `CoinAmount`.
 */
export const coinReasonLabel: Record<components['schemas']['CoinTransaction']['reason'], string> = {
  WORKOUT_DROP: 'Séance créditée',
  BATTLE_DROP: 'Combat gagné',
  PURCHASE: 'Achat',
};
