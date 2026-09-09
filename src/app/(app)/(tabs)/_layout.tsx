import { Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { SystemHeader } from '@/components/SystemHeader';
import { Beacon, SparkRail } from '@/components/SystemMotion';
import { decorativeMotion } from '@/design/decorativeMotion';
import { color, frame, glow, motion, navigation, typography } from '@/design/tokens';
import { useReducedMotion } from '@/design/useReducedMotion';

/** Cinq destinations ; les données de santé se consultent désormais depuis Réglages. */
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
        name="inventaire"
        options={{
          tabBarButtonTestID: 'tab-inventaire',
          title: 'Inventaire',
          tabBarIcon: ({ color: tint, focused }) => (
            <TabIcon name="backpack" color={tint} focused={focused} beacon={beacon.effect !== undefined} />
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
