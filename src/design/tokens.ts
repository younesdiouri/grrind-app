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
  night: '#0B0D12',
  slate: '#161A22',
  steel: '#232936',
  fog: '#8A93A6',
  chalk: '#E8ECF4',
  ember: '#FF6B35',
  gold: '#FFC857',
  mint: '#3DDC97',
  rust: '#E5484D',
} as const;

export const color = {
  background: palette.night,
  surface: palette.slate,
  surfaceRaised: palette.steel,
  text: palette.chalk,
  textMuted: palette.fog,
  /** L'XP gagnée, et l'accent du produit. */
  accent: palette.ember,
  /** Le niveau et les titres — ce qui se célèbre. */
  celebrate: palette.gold,
  /** Une ligne de breakdown positive. */
  gain: palette.mint,
  /** Une ligne de breakdown négative : rendements décroissants, plafond quotidien. */
  loss: palette.rust,
  /** Le trait d'un champ de saisie, et toute séparation qui n'est pas une surface. */
  border: palette.steel,
  /** Un refus : saisie invalide, appel rejeté. Distinct de `loss`, qui parle d'XP. */
  danger: palette.rust,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  pill: 999,
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
  DIMINISHING: 'Rendements décroissants',
  DAILY_CAP: 'Plafond quotidien',
};

/**
 * Les disciplines, rendues lisibles. Même garde-fou, même raison : `WALKING`, `HIIT` et
 * `HIKING` sont entrées au contrat avec le virage santé, et c'est le compilateur qui l'a dit.
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
};

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
};
