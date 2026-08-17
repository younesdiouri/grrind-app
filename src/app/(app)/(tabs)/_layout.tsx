import { Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, type ColorValue } from 'react-native';

import { color, space } from '@/design/tokens';

/**
 * La barre d'onglets.
 *
 * Deux destinations pour commencer — Accueil, Santé — la guilde s'ajoutera par un
 * `Tabs.Screen` d'une ligne (#41). `Tabs` d'`expo-router`, pas `unstable-native-tabs` : la
 * barre native iOS 26 est alléchante mais encore en alpha, et surtout elle échapperait aux
 * tokens — la seule surface visible sur tous les écrans deviendrait celle qu'on ne contrôle
 * pas, dans une app qui n'a qu'un thème.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.background },
        headerTintColor: color.text,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: styles.bar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'GRRIND',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color: tint }) => <TabIcon name="house" color={tint} />,
        }}
      />
      <Tabs.Screen
        name="sante"
        options={{
          title: 'Santé',
          tabBarIcon: ({ color: tint }) => (
            <TabIcon name="heart.text.square" color={tint} />
          ),
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
function TabIcon({ name, color: tint }: { name: SFSymbol; color: ColorValue }) {
  return <SymbolView name={name} size={space.lg} tintColor={tint} fallback={null} />;
}

const styles = StyleSheet.create({
  bar: { backgroundColor: color.surface, borderTopColor: color.border },
});
