import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, G, Svg } from 'react-native-svg';

import { arcPresentation, arcsOf, ATTRIBUTE_ORDER, ringViewport, type AttributeArc, type RingSize } from '@/components/attributeArcs';
import { vitalityFontSize } from '@/components/vitalityFontSize';
import { attributeColor, attributeLabel, color, opacity, radius, space, type } from '@/design/tokens';
import type { DecorativeGlow } from '@/design/decorativeGlow';
import type { DecorativeMotion } from '@/design/decorativeMotion';
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
  size?: RingSize;
  /**
   * Les quatre arcs **animés**, quand il y en a. Le séquenceur qui les fait grandir pilote des
   * valeurs partagées sur le thread UI, pas un rendu React : il ne peut donc pas passer par
   * `attributes`. Le composant prête son anneau — la piste, le centre — l'appelant fournit ce
   * qui le remplit. C'est ce qui garde Reanimated **hors** du design system, donc hors des
   * previews, qui se rendent dans Node. Voir `XpBar.children`, et `ringGeometry`/`arcStroke`
   * pour la géométrie partagée entre le tracé statique d'ici et celui, animé, de l'appelant.
   */
  children?: ReactNode;
  /**
   * Le centre de l'anneau, quand quelqu'un l'anime — la même porte que `children`, pour la
   * même raison : Vitality dessinée par un `<Text>` fixe ne peut pas suivre une valeur
   * partagée, un `useAnimatedProps` sur un `TextInput` le peut. Retombe sur le chiffre par
   * défaut quand personne ne le fournit.
   */
  center?: ReactNode;
  /** La lumière est explicite : tier, viewport et effet ne peuvent pas diverger. */
  glow?: DecorativeGlow;
  /**
   * Le cadran, **sous** les arcs (#159) : la couronne d'`orbit` et le secteur de `sweep`.
   *
   * Une porte de plus que `children`, et pas la même : celle-ci est un calque décoratif qui se
   * dessine avant la piste, donc sous les arcs et sous le chiffre de Vitalité. Les deux couches
   * tournent en sens opposés et c'est là tout l'effet — un mécanisme, pas une image qui tourne.
   *
   * `orbit` sert aussi à réserver le viewport : le nom est donné séparément parce que la
   * couronne agrandit le `Svg` **même quand elle ne se joue pas**. Sans cela, « Réduire les
   * animations » ferait rétrécir l'anneau et déplacerait tout le contenu de la carte.
   */
  underlay?: ReactNode;
  /** Le débord de la couronne, réservé par le nom seul — jamais par l'effet. */
  orbit?: DecorativeMotion<'orbit'>;
};

/**
 * Le cercle de vie : quatre arcs dont la longueur est la part de chaque caractéristique dans
 * le total, Vitality en chiffre au centre — la seule disposition où le dessin démontre la
 * valeur qu'il affiche (#69).
 */
export function AttributeRing({ attributes, vitality, size = 'inline', children, center, glow, underlay, orbit }: AttributeRingProps) {
  const { radius: ringRadius, strokeWidth, diameter, origin, innerDiameter } = ringViewport(size, glow, orbit);
  const typeScale = size === 'hero' ? type.display : type.title;
  const fontSize = vitalityFontSize(vitality, innerDiameter, typeScale.fontSize);

  return (
    <View style={styles.wrapper}>
      <Svg width={diameter} height={diameter}>
        {/* Avant la piste, donc sous tout le reste : le cadran ne doit jamais passer devant une
            part, ni devant le chiffre qu'il entoure. */}
        {underlay}
        <Circle cx={origin} cy={origin} r={ringRadius} stroke={color.surfaceRaised} strokeWidth={strokeWidth} fill="none" />
        {/* Partie au douze heures, pas aux trois : c'est là qu'un cercle de progression se lit.
            `transform`, pas `rotation`/`originX`/`originY` — dépréciés par `react-native-svg`
            lui-même, et c'est leur traduction web qui pose un `transform-origin` que React ne
            reconnaît pas comme propriété DOM. Une rotation SVG porte son centre elle-même. */}
        <G transform={`rotate(-90 ${origin} ${origin})`}>
          {children ??
            arcsOf(attributes).map((arc) => (
              <Arc
                key={arc.attribute}
                arc={arc}
                radius={ringRadius}
                origin={origin}
                strokeWidth={strokeWidth}
                glow={glow}
              />
            ))}
        </G>
      </Svg>
      <View style={[styles.center, { width: innerDiameter, height: innerDiameter }]}>
        {center ?? (
          <Text numberOfLines={1} style={[typeScale, styles.vitality, { fontSize }]}>
            {vitality}
          </Text>
        )}
      </View>
    </View>
  );
}

type ArcProps = {
  arc: AttributeArc;
  radius: number;
  origin: number;
  strokeWidth: number;
  glow?: DecorativeGlow;
};

/** Un arc statique — la géométrie du trait vient d'`arcStroke`, partagée avec l'anneau animé. */
function Arc({ arc, radius: arcRadius, origin, strokeWidth, glow }: ArcProps) {
  const presentation = arcPresentation(arc.from, arc.to, arcRadius, strokeWidth);
  const effect = glow?.effect;

  // Une part réelle (voir `arcsOf`, qui a déjà écarté les parts nulles) peut être trop fine
  // pour survivre à la compensation des bouts ronds : rien à dessiner n'est pas la même chose
  // qu'un trait de longueur nulle, qui se dessinerait quand même — un bout rond couvre un
  // point même à `strokeDasharray="0 …"`. Un point dessinerait une part invisible plus grosse
  // qu'elle ne l'est ; l'anneau se tait, la légende, elle, garde le chiffre exact.
  if (presentation.strokeLinecap === 'butt') {
    return null;
  }

  return (
    <>
      {/* Les deux tracés lisent exactement la même géométrie nette : élargir la lueur ne
          raccourcit ni ne décale l'arc qu'elle entoure. */}
      {effect === undefined ? null : (
        <Circle
          cx={origin}
          cy={origin}
          r={arcRadius}
          stroke={attributeColor[arc.attribute]}
          strokeWidth={strokeWidth + effect.spread}
          strokeOpacity={effect.opacity}
          strokeLinecap={presentation.strokeLinecap}
          fill="none"
          strokeDasharray={presentation.strokeDasharray}
          strokeDashoffset={presentation.strokeDashoffset}
        />
      )}
      <Circle
        cx={origin}
        cy={origin}
        r={arcRadius}
        stroke={attributeColor[arc.attribute]}
        strokeWidth={strokeWidth}
        strokeLinecap={presentation.strokeLinecap}
        fill="none"
        strokeDasharray={presentation.strokeDasharray}
        strokeDashoffset={presentation.strokeDashoffset}
      />
    </>
  );
}

type AttributeLegendProps = {
  /** Les mêmes quatre valeurs que l'anneau qu'elle accompagne. */
  attributes: Record<Attribute, number>;
  /**
   * La pastille, **quand quelqu'un la fait battre** (#159) — la même porte que `children` et
   * `center` ci-dessus, pour la même raison : le design system se rend dans Node, et Reanimated
   * n'y entre pas.
   *
   * Une fonction et non un nœud, parce qu'il y en a quatre : c'est le rang qui déphase la
   * cascade, et la légende est le seul endroit qui le connaisse. Absente, la pastille est un
   * aplat fixe — ce qu'elle a toujours été, et ce qu'elle reste sous « Réduire les animations ».
   */
  dot?: (attribute: Attribute, index: number) => ReactNode;
};

/**
 * Pastille, libellé, valeur — une ligne par caractéristique, dans l'ordre du contrat.
 *
 * Une part nulle reste **présente et éteinte** : « je n'ai jamais fait de mobilité » est
 * l'information la plus utile que ce composant puisse donner, et la faire disparaître serait
 * la cacher.
 */
export function AttributeLegend({ attributes, dot }: AttributeLegendProps) {
  return (
    <View style={styles.legend}>
      {ATTRIBUTE_ORDER.map((attribute, index) => {
        const value = attributes[attribute];
        const untouched = value <= 0;

        return (
          <View key={attribute} style={[styles.legendRow, untouched && styles.legendRowInert]}>
            {dot?.(attribute, index) ?? (
              <View style={[styles.dot, { backgroundColor: attributeColor[attribute] }]} />
            )}
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
  // `pointerEvents` dans le style, pas en prop : RN 0.86 déprécie la prop autonome.
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  vitality: { color: color.text },
  legend: { gap: space.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  legendRowInert: { opacity: opacity.inert },
  dot: { width: space.sm, height: space.sm, borderRadius: radius.pill },
  legendLabel: { ...type.body, color: color.text, flex: 1 },
  legendValue: { ...type.body, color: color.textMuted },
});

/** La pastille, pour qui l'anime lui-même. Voir `AttributeLegendProps.dot`, et `xpBarFill`. */
export const attributeLegendDot = styles.dot;
