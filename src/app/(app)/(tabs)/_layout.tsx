import { Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { SystemHeader } from '@/components/SystemHeader';
import { Beacon, SparkRail } from '@/components/SystemMotion';
import { decorativeMotion } from '@/design/decorativeMotion';
import { color, frame, glow, motion, navigation, typography } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';

/**
 * La barre d'onglets.
 *
 * Cinq destinations — Accueil, Santé, Combat, Guilde, Réglages. `Tabs` d'`expo-router`, pas
 * `unstable-native-tabs` : la barre native iOS 26 est alléchante mais encore en alpha, et
 * surtout elle échapperait aux tokens — la seule surface visible sur tous les écrans
 * deviendrait celle qu'on ne contrôle pas, dans une app qui n'a qu'un thème.
 *
 * ————— Réglages était un geste rare, il ne l'est plus (#99) ——————————————————————————
 *
 * Le #57 avait tranché l'inverse, et il avait raison **à ce moment-là** : Réglages ne portait
 * que les interrupteurs de catégories de notification, quelque chose qu'on règle une fois.
 *
 * Il porte depuis les **Autorisations** (#81) — le seul endroit d'où rattraper une permission
 * notifications ou Santé — et le bloc **Synchronisation** (#82), qu'on consulte à chaque fois
 * qu'on se demande si la chaîne a fonctionné. Ce n'est plus un geste rare, c'est un tableau de
 * bord, et le laisser derrière un bouton posé **sous** l'historique le rendait introuvable dès
 * qu'un compte avait des séances — exactement le défaut que la règle « résumé, action, puis
 * archive » décrit, appliqué à autre chose.
 *
 * Il ferme la marche parce que c'est la moins fréquente des cinq : la barre se lit de gauche
 * à droite dans l'ordre de l'usage.
 *
 * ————— Combat s'insère en troisième, pas en quatrième (#113) ——————————————————————————
 *
 * La même règle décide : on combat plus souvent qu'on ne consulte sa guilde. Un combat est un
 * geste qu'on répète — il n'y a rien à farmer aujourd'hui, mais il n'y a rien non plus qui en
 * limite le nombre — là où la Guilde se visite quand quelque chose s'y est passé, et c'est une
 * notification qui le dit.
 *
 * Il se pose donc juste après Santé, qui reste devant lui : c'est la synchronisation qui rend
 * un combattant plus fort, et l'ordre de la barre raconte cette dépendance-là.
 *
 * ————— Pourquoi chaque onglet porte un `testID` (#122) ————————————————————————————————
 *
 * iOS ne rend pas le libellé de l'onglet tel qu'il est écrit ici : il le compose avec son
 * rôle et sa position — « Accueil » devient « Accueil, tab, 1 of 5 ». Un pilote E2E qui
 * cherche le texte exact ne trouve donc rien, et celui qui cherche le texte composé dépend
 * d'une phrase que ni nous ni la langue du simulateur ne décidons. `tabBarButtonTestID` pose
 * un identifiant que personne ne reformule.
 *
 * ————— Les onglets passent à `SystemHeader` (#159) —————————————————————————————————————
 *
 * Ils portaient l'en-tête de React Navigation, recoloré par `headerStyle` : le même titre, mais
 * sans le filet d'accent qui identifie un en-tête GRRIND, et sans nulle part où poser le curseur
 * ni le point courant. Les cinq écrans les plus vus de l'app étaient donc les seuls à ne pas
 * porter l'en-tête du système ; c'est un défaut de châssis que le mouvement a rendu visible,
 * pas un choix de départ.
 *
 * `canGoBack` est faux par construction : un onglet est une racine, il n'y a rien derrière.
 */
export default function TabsLayout() {
  // Résolue une fois pour la barre entière : cinq onglets qui liraient chacun la préférence
  // système monteraient cinq abonnements pour une seule réponse.
  const beacon = decorativeMotion('beacon', useReducedMotion());

  return (
    <Tabs
      screenOptions={{
        header: ({ options, route }) => (
          <SystemHeader title={options.title ?? route.name} canGoBack={false} />
        ),
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: styles.bar,
        sceneStyle: styles.scene,
        tabBarLabelStyle: styles.label,
        // Le filet de la barre est un calque, pas une bordure : un point ne peut pas parcourir
        // un `borderTopColor`. `tabBarBackground` est la seule porte que React Navigation ouvre
        // **sous** les onglets et au-dessus du fond, donc la seule place possible.
        tabBarBackground:
          beacon.effect === undefined
            ? undefined
            : () => <SparkRail style={styles.rail} offset={motion.beacon.phase.tabs} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarButtonTestID: 'tab-accueil',
          title: 'GRRIND',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color: tint, focused }) => <TabIcon name="house" color={tint} focused={focused} beacon={beacon.effect !== undefined} />,
        }}
      />
      <Tabs.Screen
        name="sante"
        options={{
          tabBarButtonTestID: 'tab-sante',
          title: 'Santé',
          tabBarIcon: ({ color: tint, focused }) => (
            <TabIcon name="heart.text.square" color={tint} focused={focused} beacon={beacon.effect !== undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="combat"
        options={{
          tabBarButtonTestID: 'tab-combat',
          title: 'Combat',
          tabBarIcon: ({ color: tint, focused }) => <TabIcon name="bolt.shield" color={tint} focused={focused} beacon={beacon.effect !== undefined} />,
        }}
      />
      <Tabs.Screen
        name="guilde"
        options={{
          tabBarButtonTestID: 'tab-guilde',
          title: 'Guilde',
          tabBarIcon: ({ color: tint, focused }) => <TabIcon name="person.2" color={tint} focused={focused} beacon={beacon.effect !== undefined} />,
        }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          tabBarButtonTestID: 'tab-reglages',
          title: 'Réglages',
          tabBarIcon: ({ color: tint, focused }) => <TabIcon name="gearshape" color={tint} focused={focused} beacon={beacon.effect !== undefined} />,
        }}
      />
    </Tabs>
  );
}

/**
 * Une icône SF Symbols, avec repli.
 *
 * `SymbolView` ne rend rien sur Android et sur le web quand `name` est une chaîne simple —
 * ce module cible SF Symbols, pas Material Symbols. Android n'est pas la cible de ce ticket
 * (#15), mais l'absence de repli plante silencieusement l'icône plutôt que la barre : le
 * `fallback` garde l'écran debout en attendant la table de correspondance qu'ouvrira #15.
 */
function TabIcon({
  name,
  color: tint,
  focused,
  beacon,
}: {
  name: SFSymbol;
  color: ColorValue;
  focused: boolean;
  /** Le losange bat, ou il ne bat pas — mais il reste, à sa place et à sa taille pleine. */
  beacon: boolean;
}) {
  return (
    <View style={styles.icon}>
      {focused ? beacon ? <Beacon style={styles.marker} rotate={navigation.markerRotation} /> : <View style={styles.marker} /> : null}
      <SymbolView name={name} size={navigation.iconSize} tintColor={tint} fallback={null} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: color.surface,
    borderTopColor: color.accent,
    borderTopWidth: frame.segmentThickness,
  },
  /** Le filet couché sous le trait d'accent, sur toute la largeur de la barre. */
  rail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: frame.segmentThickness,
  },
  scene: { backgroundColor: 'transparent' },
  label: { fontFamily: typography.display.semibold },
  icon: { position: 'relative' },
  marker: {
    position: 'absolute',
    top: navigation.markerOffset,
    alignSelf: 'center',
    width: navigation.markerSize,
    height: navigation.markerSize,
    backgroundColor: color.accent,
    // La rotation reste ici : c'est la forme du marqueur, pas son battement. `Beacon` la reprend
    // dans sa propre liste de transformations, sous l'échelle qui, elle, respire.
    transform: [{ rotate: navigation.markerRotation }],
    boxShadow: glow.soft.boxShadow,
  },
});
