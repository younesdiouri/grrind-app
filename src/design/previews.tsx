import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { BreakdownRow } from '@/components/BreakdownRow';
import { Button } from '@/components/Button';
import { CapacityGauge } from '@/components/CapacityGauge';
import { DangerRow } from '@/components/DangerRow';
import { DisciplineChip } from '@/components/DisciplineChip';
import { Field } from '@/components/Field';
import { InviteCodeBlock } from '@/components/InviteCodeBlock';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { RoleBadge } from '@/components/RoleBadge';
import { SessionCard } from '@/components/SessionCard';
import { TitleBadge } from '@/components/TitleBadge';
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
];
