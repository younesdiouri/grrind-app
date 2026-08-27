import { Tabs } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, type ColorValue } from 'react-native';

import { color, space } from '@/design/tokens';

/**
 * La barre d'onglets.
 *
 * Quatre destinations — Accueil, Santé, Guilde, Réglages. `Tabs` d'`expo-router`, pas
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
 * Il ferme la marche parce que c'est la moins fréquente des quatre : la barre se lit de gauche
 * à droite dans l'ordre de l'usage.
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
        sceneStyle: styles.scene,
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
      <Tabs.Screen
        name="guilde"
        options={{
          title: 'Guilde',
          tabBarIcon: ({ color: tint }) => <TabIcon name="person.2" color={tint} />,
        }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ color: tint }) => <TabIcon name="gearshape" color={tint} />,
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
  scene: { backgroundColor: color.background },
});
