import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { AttributeLegend, AttributeRing } from '@/components/AttributeRing';
import { BattleResultBadge } from '@/components/BattleResultBadge';
import { BattleRow } from '@/components/BattleRow';
import { BreakdownRow } from '@/components/BreakdownRow';
import { Button } from '@/components/Button';
import { CapacityGauge } from '@/components/CapacityGauge';
import { DangerRow } from '@/components/DangerRow';
import { DisciplineChip } from '@/components/DisciplineChip';
import { EnemyCard } from '@/components/EnemyCard';
import { Field } from '@/components/Field';
import { GuildMemberRow } from '@/components/GuildMemberRow';
import { InviteCodeBlock } from '@/components/InviteCodeBlock';
import { NoCreditRow } from '@/components/NoCreditRow';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { RisalaCard } from '@/components/RisalaCard';
import { RoleBadge } from '@/components/RoleBadge';
import { SessionCard } from '@/components/SessionCard';
import { TitleBadge } from '@/components/TitleBadge';
import { ToggleRow } from '@/components/ToggleRow';
import { XpBar } from '@/components/XpBar';
import {
  color,
  curve,
  disciplineLabel,
  duration,
  palette,
  radius,
  space,
  type,
} from '@/design/tokens';

/**
 * Les spécimens : ce que chaque composant montre de lui-même.
 *
 * **Ce fichier ne dessine rien.** Il choisit des états — un bouton occupé, un champ en
 * erreur, une ligne de breakdown négative — et les compose avec les composants tels quels.
 * C'est ce qui fait tenir le sens unique : `scripts/build-previews.ts` rend ceci avec
 * `react-native-web`, et la preview HTML ne peut donc pas dériver du composant natif. Une
 * preview qui ment est une preview qu'on n'a pas régénérée, et la CI le voit.
 *
 * Les données sont écrites à la main, contrairement aux fixtures du séquenceur. La différence
 * est assumée : une fixture doit prouver que le calcul du serveur se joue correctement, un
 * spécimen doit montrer les états qu'on veut **regarder** — celui qui déborde, celui qui est
 * vide, celui qui est négatif. Ce sont deux besoins opposés.
 *
 * Rien dans l'app n'importe ce fichier : Metro ne l'embarque jamais.
 */

export type Preview = {
  /** Le nom du fichier produit, et l'identité de la carte : il ne change pas. */
  slug: string;
  /** Le titre de la carte dans le volet Design System. */
  name: string;
  /** La section du volet. La carte s'y range par le marqueur `@dsCard`. */
  group: 'Fondations' | 'Composants';
  element: ReactNode;
};

const DISCIPLINES = Object.keys(disciplineLabel) as components['schemas']['Discipline'][];

/** Un adversaire du catalogue, à trouer au cas par cas — voir les spécimens. */
function enemy(overrides: Partial<components['schemas']['Enemy']>): components['schemas']['Enemy'] {
  return {
    key: 'SAND_JACKAL',
    name: 'Chacal des sables',
    minimumLevel: 1,
    hp: 120,
    damage: 12,
    mitigationPercent: 5,
    extraTurnPercent: 4,
    dodgePercent: 3,
    ...overrides,
  };
}

/** Un membre de guilde, avec des trous à combler au cas par cas — voir les spécimens. */
function guildMember(
  overrides: Partial<components['schemas']['GuildMember']>,
): components['schemas']['GuildMember'] {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    displayName: 'Sam Petit',
    registeredAt: '2025-11-02T00:00:00Z',
    level: 7,
    xpIntoLevel: 340,
    xpToNextLevel: 900,
    title: null,
    attributes: { strength: 0, endurance: 0, mobility: 0, dexterity: 0, vitality: 0 },
    vitalityBreakdown: { windowAverageActiveKcal: 420, targetActiveKcal: 500, bonusPermille: 168 },
    role: 'MEMBER',
    joinedAt: '2025-11-03T08:00:00Z',
    ...overrides,
  };
}

/**
 * La largeur d'une preview, en points : celle d'un iPhone.
 *
 * Une carte de design system se regarde à la taille où le composant vivra. Rendue large, une
 * carte de séance ne montrerait jamais ce qui compte — la ligne de mesures qui déborde.
 */
export const PAGE_WIDTH = 390;

/** La page d'une preview : le fond de l'app, et l'air autour. */
export function Page({ children }: { children: ReactNode }) {
  return <View style={styles.page}>{children}</View>;
}

/** Un état, sous son nom. Sans le nom, une planche de variantes est une devinette. */
function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.specimen}>
      <Text style={styles.specimenLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchChip, { backgroundColor: value }]} />
      <Text style={styles.swatchName}>{name}</Text>
      <Text style={styles.swatchValue}>{value}</Text>
    </View>
  );
}

// Les feuilles de style viennent avant les spécimens, contrairement au reste du dépôt :
// `PREVIEWS` construit ses éléments au chargement du module, et ce qu'il compose doit
// donc déjà exister.
const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    backgroundColor: color.background,
    padding: space.lg,
    gap: space.lg,
  },
  specimen: { gap: space.sm },
  specimenLabel: { ...type.label, color: color.textMuted },
  stack: { gap: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  metaText: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  typeSample: { color: color.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  swatch: { gap: space.xs },
  swatchChip: {
    width: space.xl,
    height: space.xl,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  swatchName: { ...type.label, color: color.text, letterSpacing: 0 },
  swatchValue: { ...type.label, color: color.textMuted, letterSpacing: 0 },
  rulers: { gap: space.xs },
  ruler: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rulerBar: { height: space.sm, backgroundColor: color.accent, borderRadius: radius.pill },
  radii: { flexDirection: 'row', gap: space.md },
  radiusCell: { gap: space.xs, alignItems: 'center' },
  radiusBox: { width: space.xl, height: space.xl, backgroundColor: color.surfaceRaised },
});

export const PREVIEWS: Preview[] = [
  {
    slug: 'fondations',
    name: 'Fondations',
    group: 'Fondations',
    element: (
      <>
        <Specimen label="Palette">
          <View style={styles.swatches}>
            {Object.entries(palette).map(([name, value]) => (
              <Swatch key={name} name={name} value={value} />
            ))}
          </View>
        </Specimen>

        <Specimen label="Rôles">
          <View style={styles.swatches}>
            {Object.entries(color).map(([name, value]) => (
              <Swatch key={name} name={name} value={value} />
            ))}
          </View>
        </Specimen>

        <Specimen label="Typographie">
          <View style={styles.stack}>
            {Object.entries(type).map(([name, style]) => (
              <Text key={name} style={[style, styles.typeSample]}>
                {name} · {style.fontSize}
              </Text>
            ))}
          </View>
        </Specimen>

        <Specimen label="Espacements">
          <View style={styles.rulers}>
            {Object.entries(space).map(([name, value]) => (
              <View key={name} style={styles.ruler}>
                <View style={[styles.rulerBar, { width: value }]} />
                <Text style={styles.metaText}>
                  {name} · {value}
                </Text>
              </View>
            ))}
          </View>
        </Specimen>

        <Specimen label="Rayons">
          <View style={styles.radii}>
            {Object.entries(radius).map(([name, value]) => (
              <View key={name} style={styles.radiusCell}>
                <View style={[styles.radiusBox, { borderRadius: value }]} />
                <Text style={styles.metaText}>{name}</Text>
              </View>
            ))}
          </View>
        </Specimen>

        {/* Les durées ne se voient pas sur une image fixe : elles se lisent. C'est aussi la
            raison d'être de la ligne — une échelle qu'on peut citer se recopie moins. */}
        <Specimen label="Durées (mesurées sur appareil)">
          <View style={styles.stack}>
            {Object.entries(duration).map(([name, value]) => (
              <View key={name} style={styles.row}>
                <Text style={styles.metaText}>{name}</Text>
                <Text style={styles.metaText}>{value} ms</Text>
              </View>
            ))}
          </View>
        </Specimen>

        <Specimen label="Courbes">
          <View style={styles.stack}>
            {Object.entries(curve).map(([name, points]) => (
              <View key={name} style={styles.row}>
                <Text style={styles.metaText}>{name}</Text>
                <Text style={styles.metaText}>cubic-bezier({points.join(', ')})</Text>
              </View>
            ))}
          </View>
        </Specimen>
      </>
    ),
  },
  {
    slug: 'bouton',
    name: 'Bouton',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Plein">
          <Button label="Synchroniser" onPress={() => {}} />
        </Specimen>
        <Specimen label="Discret">
          <Button label="Se déconnecter" onPress={() => {}} variant="quiet" />
        </Specimen>
        <Specimen label="Occupé">
          <Button label="Synchroniser" onPress={() => {}} busy />
        </Specimen>
        <Specimen label="Inerte">
          <Button label="Synchroniser" onPress={() => {}} disabled />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'champ',
    name: 'Champ de saisie',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Vide">
          <Field label="Adresse e-mail" placeholder="toi@exemple.fr" />
        </Specimen>
        <Specimen label="Rempli">
          <Field label="Adresse e-mail" value="joueur@grrind.app" />
        </Specimen>
        {/* Le message vient d'une violation du 422, qui nomme son champ : il s'accroche
            sous l'entrée fautive, jamais dans un bandeau en haut du formulaire. */}
        <Specimen label="Refusé">
          <Field label="Mot de passe" value="court" error="8 caractères au minimum." />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'chip-discipline',
    name: 'Chip de discipline',
    group: 'Composants',
    element: (
      <Specimen label="Le vocabulaire fermé du contrat">
        <View style={styles.chips}>
          {DISCIPLINES.map((discipline) => (
            <DisciplineChip key={discipline} discipline={discipline} />
          ))}
        </View>
      </Specimen>
    ),
  },
  {
    slug: 'carte-seance',
    name: 'Carte de séance',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Historique — tout mesuré">
          <SessionCard
            discipline="RUNNING"
            duration="52 min"
            when="hier, 07:12"
            measures={['8,4 km', '124 m D+', '612 kcal', '148 bpm']}
          />
        </Specimen>
        {/* Aucun appareil ne fournit tout : la carte doit tenir sans une seule mesure. */}
        <Specimen label="Séquenceur — la séance seule">
          <SessionCard discipline="STRENGTH" duration="1 h 05" />
        </Specimen>
        <Specimen label="Le cas court">
          <SessionCard discipline="MOBILITY" duration="moins d’une minute" when="aujourd’hui" />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'carte-risala',
    name: 'Carte de Risāla',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Reçue — le régime établi">
          <RisalaCard
            discipline="CLIMBING"
            senderDisplayName="Younes"
            bonusPercent={150}
            timeLeft="expire dans 7 jours"
          />
        </Specimen>
        <Specimen label="Envoyée — le bonus de l'expéditeur">
          <RisalaCard
            discipline="RUNNING"
            senderDisplayName="Léa Durand"
            bonusPercent={50}
            timeLeft="expire demain"
          />
        </Specimen>
        {/* L'expéditeur a quitté la guilde depuis la révélation : son défi reste, son nom
            n'est plus celui d'un co-équipier (#105). */}
        <Specimen label="Expéditeur parti depuis">
          <RisalaCard
            discipline="HIKING"
            senderDisplayName={null}
            bonusPercent={150}
            timeLeft="expire dans moins d’une heure"
          />
        </Specimen>
        {/* Une réponse en vol pendant la bascule du dimanche 20 h peut porter une Risāla déjà
            éteinte : ce n'est pas une erreur, c'est ce que le serveur vient d'envoyer. */}
        <Specimen label="Déjà expirée — une réponse en vol">
          <RisalaCard discipline="STRENGTH" senderDisplayName="Zed" bonusPercent={150} timeLeft="expirée" />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'barre-xp',
    name: 'Barre d’XP',
    group: 'Composants',
    element: (
      <>
        <Specimen label="En ligne — vide, en cours, pleine">
          <View style={styles.stack}>
            <XpBar fill={0} />
            <XpBar fill={0.38} />
            <XpBar fill={1} />
          </View>
        </Specimen>
        <Specimen label="De tête — celle du séquenceur">
          <XpBar size="hero" fill={0.72} />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'cercle-de-vie',
    name: 'Cercle de vie',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Réparti — une pratique variée">
          <View style={styles.row}>
            <AttributeRing
              vitality={92}
              attributes={{ strength: 5200, endurance: 4800, mobility: 4300, dexterity: 5100 }}
            />
            <AttributeLegend attributes={{ strength: 5200, endurance: 4800, mobility: 4300, dexterity: 5100 }} />
          </View>
        </Specimen>
        <Specimen label="Monospécialisé — presque tout en force">
          <View style={styles.row}>
            <AttributeRing
              vitality={18}
              attributes={{ strength: 9000, endurance: 300, mobility: 150, dexterity: 200 }}
            />
            <AttributeLegend attributes={{ strength: 9000, endurance: 300, mobility: 150, dexterity: 200 }} />
          </View>
        </Specimen>
        {/* Une part réelle (~1 %), trop fine pour survivre à l'écart et à l'épaisseur du
            trait : l'anneau ne dessine rien pour elle plutôt qu'un point qui la grossirait —
            la légende, elle, garde le chiffre exact. Sans cette carte, le cas redevient
            invisible dès qu'on ne le cherche plus. */}
        <Specimen label="Part infime — sous le seuil de trait">
          <View style={styles.row}>
            <AttributeRing vitality={8} attributes={{ strength: 9900, endurance: 100, mobility: 0, dexterity: 0 }} />
            <AttributeLegend attributes={{ strength: 9900, endurance: 100, mobility: 0, dexterity: 0 }} />
          </View>
        </Specimen>
        {/* Vitality n'a pas de plafond : cinq chiffres tiennent dans l'anneau sans déborder,
            parce que la taille se calcule — voir `vitalityFontSize`. */}
        <Specimen label="Vitality à cinq chiffres">
          <View style={styles.row}>
            <AttributeRing
              size="hero"
              vitality={18420}
              attributes={{ strength: 52000, endurance: 48000, mobility: 43000, dexterity: 51000 }}
            />
            <AttributeLegend attributes={{ strength: 52000, endurance: 48000, mobility: 43000, dexterity: 51000 }} />
          </View>
        </Specimen>
        {/* Une part nulle ne dessine rien, ni trait ni écart — et sa ligne reste là, éteinte. */}
        <Specimen label="Une caractéristique jamais touchée — la mobilité">
          <View style={styles.row}>
            <AttributeRing
              vitality={61}
              attributes={{ strength: 3000, endurance: 2500, mobility: 0, dexterity: 2000 }}
            />
            <AttributeLegend attributes={{ strength: 3000, endurance: 2500, mobility: 0, dexterity: 2000 }} />
          </View>
        </Specimen>
        {/* `PlayerProgression::untouched()` : cinq zéros, aucun arc. */}
        <Specimen label="Compte neuf — tout à zéro">
          <View style={styles.row}>
            <AttributeRing
              size="hero"
              vitality={0}
              attributes={{ strength: 0, endurance: 0, mobility: 0, dexterity: 0 }}
            />
            <AttributeLegend attributes={{ strength: 0, endurance: 0, mobility: 0, dexterity: 0 }} />
          </View>
        </Specimen>
      </>
    ),
  },
  {
    slug: 'ligne-breakdown',
    name: 'Ligne de breakdown',
    group: 'Composants',
    element: (
      <Specimen label="Un calcul complet, rabots compris">
        <View style={styles.stack}>
          <BreakdownRow source="BASE" amount={120} />
          <BreakdownRow source="DISTANCE" amount={34} />
          <BreakdownRow source="ELEVATION" amount={12} />
          <BreakdownRow source="STREAK" amount={18} />
          {/* Les lignes négatives sont des règles du jeu, pas des erreurs : elles se
              montrent, et la barre redescend avec elles. */}
          <BreakdownRow source="DIMINISHING" amount={-27} />
          <BreakdownRow source="DAILY_CAP" amount={-40} />
        </View>
      </Specimen>
    ),
  },
  {
    slug: 'ligne-sans-credit',
    name: 'Ligne sans crédit',
    group: 'Composants',
    element: (
      <Specimen label="Quand il n'y a pas eu de calcul du tout">
        {/* Elle prend la place exacte du breakdown, sans porter de nombre : une ligne
            « base : 0 » mentirait sur un calcul qui n'a jamais eu lieu, et c'est précisément
            ce que le serveur refuse d'envoyer. Ni `gain` ni `loss` non plus — il ne s'est
            produit ni l'un ni l'autre. */}
        <NoCreditRow reason="NO_XP_FEEDS_VITALITY" />
      </Specimen>
    ),
  },
  {
    slug: 'badge-titre',
    name: 'Badge de titre',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Il vient de tomber">
          <TitleBadge name="Premiers pas" caption="Titre débloqué" />
        </Specimen>
        <Specimen label="Il est porté">
          <TitleBadge name="Lève-tôt" />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'avatar-joueur',
    name: 'Avatar de joueur',
    group: 'Composants',
    element: (
      // Deux Sam sont un cas normal : la pastille ne distingue rien, c'est l'id qui le fait.
      <Specimen label="Deux membres homonymes">
        <View style={styles.chips}>
          <PlayerAvatar name="Sam Petit" />
          <PlayerAvatar name="Sam Petit" />
          <PlayerAvatar name="Zed" />
        </View>
      </Specimen>
    ),
  },
  {
    slug: 'badge-role',
    name: 'Badge de rôle',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Fondateur">
          <RoleBadge role="FOUNDER" />
        </Specimen>
        {/* Un membre ordinaire ne porte aucun badge : rien à montrer n'est pas une carte
            vide, c'est le composant qui rend null — voir sa source. */}
        <Specimen label="Membre — rien à montrer">
          <RoleBadge role="MEMBER" />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'jauge-capacite',
    name: 'Jauge de capacité',
    group: 'Composants',
    element: (
      <>
        <Specimen label="En cours de remplissage">
          <CapacityGauge memberCount={12} capacity={30} />
        </Specimen>
        {/* Une autre guilde, un autre équilibrage : rien ici ne suppose 30. */}
        <Specimen label="Une capacité différente, complète">
          <CapacityGauge memberCount={8} capacity={8} />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'code-invitation',
    name: "Code d'invitation",
    group: 'Composants',
    element: (
      <Specimen label="Huit caractères, une date, jamais un compte à rebours">
        <InviteCodeBlock code="K7QM3XPB" expiresAt="Valable jusqu’à demain 18 h" />
      </Specimen>
    ),
  },
  {
    slug: 'ligne-danger',
    name: 'Ligne de danger',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Quitter">
          <DangerRow label="Quitter la guilde" onPress={() => {}} />
        </Specimen>
        <Specimen label="Occupé">
          <DangerRow label="Dissoudre la guilde" onPress={() => {}} busy />
        </Specimen>
        <Specimen label="Inerte">
          <DangerRow label="Exclure Sam Petit" onPress={() => {}} disabled />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'ligne-bascule',
    name: 'Ligne de réglage',
    group: 'Composants',
    element: (
      <View style={styles.stack}>
        <Specimen label="Activée">
          <ToggleRow label="Activité de guilde" value={true} onValueChange={() => {}} />
        </Specimen>
        <Specimen label="Désactivée">
          <ToggleRow label="Activité de guilde" value={false} onValueChange={() => {}} />
        </Specimen>
        {/* Le réglage part vers le serveur : l'interrupteur cède la place au témoin, comme
            `Button`/`DangerRow` le font pour un appui. */}
        <Specimen label="Occupée">
          <ToggleRow label="Activité de guilde" value={true} onValueChange={() => {}} busy />
        </Specimen>
      </View>
    ),
  },
  {
    slug: 'ligne-membre-guilde',
    name: 'Ligne de membre',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Fondateur, titre porté">
          <GuildMemberRow
            member={guildMember({
              displayName: 'Léa Durand',
              role: 'FOUNDER',
              level: 12,
              xpIntoLevel: 640,
              xpToNextLevel: 1200,
              title: {
                id: 'first_steps',
                name: 'Premiers pas',
                hint: 'Termine ta première séance',
                unlocked: true,
                unlockedAt: '2025-10-01T00:00:00Z',
                progress: { current: 1, target: 1, unit: 'SESSIONS' },
              },
            })}
          />
        </Specimen>
        {/* `title === null` : la ligne du titre disparaît, la mise en page ne bouge pas. */}
        <Specimen label="Membre, sans titre">
          <GuildMemberRow member={guildMember({ displayName: 'Zed', title: null })} />
        </Specimen>
        {/* `xpToNextLevel === null` : niveau maximum, la barre reste pleine — jamais à zéro. */}
        <Specimen label="Niveau maximum">
          <GuildMemberRow
            member={guildMember({
              displayName: 'Jean De La Fontaine',
              level: 60,
              xpIntoLevel: 48000,
              xpToNextLevel: null,
            })}
          />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'carte-adversaire',
    name: 'Carte d’adversaire',
    group: 'Composants',
    element: (
      <>
        <Specimen label="À portée">
          <EnemyCard enemy={enemy({})} />
        </Specimen>
        {/* Verrouillé : la carte reste **lisible**, elle ne disparaît pas. C'est ce qui donne
            une raison de monter de niveau — la cacher rendrait le catalogue d'un joueur de
            niveau 1 indiscernable d'un catalogue vide. */}
        <Specimen label="Hors de portée">
          <EnemyCard
            enemy={enemy({ key: 'STORM_HYENA', name: 'Hyène des tempêtes', minimumLevel: 20, hp: 640, damage: 40, mitigationPercent: 18, extraTurnPercent: 13, dodgePercent: 10 })}
            locked
          />
        </Specimen>
        {/* Un boss se dessine **exactement** comme un ennemi ordinaire : le contrat ne les
            distingue pas, et le client n'invente pas la distinction. Ce spécimen est là pour
            qu'on le voie, pas pour montrer une variante — il n'y en a pas. */}
        <Specimen label="Un boss : même carte, plus gros chiffres">
          <EnemyCard
            enemy={enemy({ key: 'CINDER_SOVEREIGN', name: 'Souverain des cendres', minimumLevel: 50, hp: 3600, damage: 190, mitigationPercent: 44, extraTurnPercent: 33, dodgePercent: 25 })}
            locked
          />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'badge-issue-combat',
    name: 'Issue d’un combat',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Victoire">
          <BattleResultBadge result="VICTORY" />
        </Specimen>
        {/* Une défaite n'emprunte rien au vocabulaire d'un refus : elle est éteinte, pas
            alarmante. Rien n'a mal tourné — on a perdu, on y retourne. */}
        <Specimen label="Défaite">
          <BattleResultBadge result="DEFEAT" />
        </Specimen>
      </>
    ),
  },
  {
    slug: 'ligne-combat',
    name: 'Ligne d’historique de combat',
    group: 'Composants',
    element: (
      <>
        <Specimen label="Victoire">
          <BattleRow result="VICTORY" enemyName="Chacal des sables" turns="16 tours" when="Aujourd’hui, 15:25" />
        </Specimen>
        <Specimen label="Défaite, contre un boss">
          <BattleRow result="DEFEAT" enemyName="Souverain des dunes" turns="21 tours" when="Hier, 09:05" />
        </Specimen>
        {/* Le singulier existe : un combat peut se conclure en un tour. */}
        <Specimen label="Un seul tour">
          <BattleRow result="VICTORY" enemyName="Chacal de fer" turns="1 tour" when="20 août" />
        </Specimen>
        {/* Le nom cède avant la pastille : c'est l'issue qui doit rester lisible en défilant. */}
        <Specimen label="Nom qui déborde">
          <BattleRow result="DEFEAT" enemyName="Matriarche des tempêtes obsidiennes" turns="33 tours" when="12 août" />
        </Specimen>
      </>
    ),
  },
];
