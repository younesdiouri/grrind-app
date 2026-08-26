import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, G, Svg } from 'react-native-svg';

import { arcsOf, ATTRIBUTE_ORDER, type AttributeArc } from '@/components/attributeArcs';
import { attributeColor, attributeLabel, color, opacity, radius, ring, space, type } from '@/design/tokens';
import type { Attribute } from '@/design/tokens';

type AttributeRingProps = {
  /**
   * Les quatre caractéristiques qui reçoivent de l'XP, dans l'ordre du contrat — voir
   * `arcsOf`. Ignorées quand un enfant est fourni.
   */
  attributes: Record<Attribute, number>;
  /**
   * Vitality, au centre : **dérivée** des quatre autres, jamais un cinquième arc — voir le
   * ticket. Toujours affichée telle quelle, animée ou non : ce composant ne fait aucun calcul.
   */
  vitality: number;
  /** La tête d'un profil, ou la ligne d'une carte de guilde. */
  size?: 'inline' | 'hero';
  /**
   * Les quatre arcs **animés**, quand il y en a. Le séquenceur qui les fait grandir pilote des
   * valeurs partagées sur le thread UI, pas un rendu React : il ne peut donc pas passer par
   * `attributes`. Le composant prête son anneau — la piste, le centre — l'appelant fournit ce
   * qui le remplit. C'est ce qui garde Reanimated **hors** du design system, donc hors des
   * previews, qui se rendent dans Node. Voir `XpBar.children`.
   */
  children?: ReactNode;
};

/**
 * Le cercle de vie : quatre arcs dont la longueur est la part de chaque caractéristique dans
 * le total, Vitality en chiffre au centre — la seule disposition où le dessin démontre la
 * valeur qu'il affiche (#69).
 */
export function AttributeRing({ attributes, vitality, size = 'inline', children }: AttributeRingProps) {
  const radius = ring.radius[size];
  const strokeWidth = ring.strokeWidth[size];
  const diameter = radius * 2 + strokeWidth;
  const center = diameter / 2;

  return (
    <View style={styles.wrapper}>
      <Svg width={diameter} height={diameter}>
        <Circle cx={center} cy={center} r={radius} stroke={color.surfaceRaised} strokeWidth={strokeWidth} fill="none" />
        {/* Partie au douze heures, pas aux trois : c'est là qu'un cercle de progression se lit. */}
        <G rotation={-90} originX={center} originY={center}>
          {children ??
            arcsOf(attributes).map((arc) => (
              <Arc key={arc.attribute} arc={arc} radius={radius} center={center} strokeWidth={strokeWidth} />
            ))}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[size === 'hero' ? type.display : type.title, styles.vitality]}>{vitality}</Text>
      </View>
    </View>
  );
}

type ArcProps = { arc: AttributeArc; radius: number; center: number; strokeWidth: number };

/**
 * Un arc, en trait de cercle plutôt qu'en chemin : la longueur voulue puis le vide sur le
 * reste de la circonférence (`strokeDasharray`), décalés du point de départ de l'arc
 * (`strokeDashoffset`). C'est la technique du donut chart — elle évite le calcul des points
 * d'un arc SVG pour ce qui reste, in fine, un simple pourcentage de tour.
 */
function Arc({ arc, radius, center, strokeWidth }: ArcProps) {
  const circumference = 2 * Math.PI * radius;
  // Le vide entre deux arcs vient du même vocabulaire que le reste des espacements — pas un
  // angle choisi à l'œil. Converti en longueur d'arc, il se soustrait pour moitié de chaque
  // côté, jamais retranché d'une part nulle : `arcsOf` ne lui en a laissé aucune.
  const gap = space.xs;
  const length = Math.max(0, (arc.to - arc.from) * circumference - gap);

  return (
    <Circle
      cx={center}
      cy={center}
      r={radius}
      stroke={attributeColor[arc.attribute]}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={`${length} ${circumference - length}`}
      strokeDashoffset={-(arc.from * circumference + gap / 2)}
    />
  );
}

type AttributeLegendProps = {
  /** Les mêmes quatre valeurs que l'anneau qu'elle accompagne. */
  attributes: Record<Attribute, number>;
};

/**
 * Pastille, libellé, valeur — une ligne par caractéristique, dans l'ordre du contrat.
 *
 * Une part nulle reste **présente et éteinte** : « je n'ai jamais fait de mobilité » est
 * l'information la plus utile que ce composant puisse donner, et la faire disparaître serait
 * la cacher.
 */
export function AttributeLegend({ attributes }: AttributeLegendProps) {
  return (
    <View style={styles.legend}>
      {ATTRIBUTE_ORDER.map((attribute) => {
        const value = attributes[attribute];
        const untouched = value <= 0;

        return (
          <View key={attribute} style={[styles.legendRow, untouched && styles.legendRowInert]}>
            <View style={[styles.dot, { backgroundColor: attributeColor[attribute] }]} />
            <Text style={styles.legendLabel}>{attributeLabel[attribute]}</Text>
            <Text style={styles.legendValue}>{value}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  vitality: { color: color.text },
  legend: { gap: space.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  legendRowInert: { opacity: opacity.inert },
  dot: { width: space.sm, height: space.sm, borderRadius: radius.pill },
  legendLabel: { ...type.body, color: color.text, flex: 1 },
  legendValue: { ...type.body, color: color.textMuted },
});
