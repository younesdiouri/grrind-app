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
} as const;

/**
 * Le vocabulaire des sources d'XP, rendu lisible.
 *
 * Le serveur envoie l'enum, pas la phrase — il n'a aucune raison de connaître la langue de
 * l'écran. Le mapping est **exhaustif par construction** : `Record` sur l'union du schéma
 * généré, donc le compilateur casse le jour où le back ajoute une source.
 */
export const xpSourceLabel: Record<
  'BASE' | 'STREAK' | 'ITEM' | 'SKILL' | 'LEAGUE' | 'DIMINISHING' | 'DAILY_CAP',
  string
> = {
  BASE: 'Effort',
  STREAK: 'Série',
  ITEM: 'Équipement',
  SKILL: 'Compétence',
  LEAGUE: 'Ligue',
  DIMINISHING: 'Rendements décroissants',
  DAILY_CAP: 'Plafond quotidien',
};

export const disciplineLabel: Record<
  'RUNNING' | 'CYCLING' | 'SWIMMING' | 'STRENGTH' | 'MOBILITY' | 'CLIMBING',
  string
> = {
  RUNNING: 'Course',
  CYCLING: 'Vélo',
  SWIMMING: 'Natation',
  STRENGTH: 'Musculation',
  MOBILITY: 'Mobilité',
  CLIMBING: 'Escalade',
};
