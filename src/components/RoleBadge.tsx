import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { color, radius, space, type } from '@/design/tokens';

type RoleBadgeProps = {
  role: components['schemas']['GuildMember']['role'];
};

/**
 * Le rôle d'un membre, seulement quand il y a quelque chose à dire.
 *
 * Un membre ordinaire ne porte aucun badge — c'est l'état par défaut d'une guilde, il n'a
 * pas besoin d'être nommé. Le fondateur, lui, se distingue **en texte**, jamais par une
 * couronne ou une icône codée en dur : le rôle n'a que deux valeurs au contrat, et un
 * pictogramme pour une seule d'entre elles serait un jeu d'icônes qu'on invente ici.
 *
 * **La garde teste `'FOUNDER'`, pas `'MEMBER'`.** Le jour où le back ajoute un rôle, un test
 * sur `'MEMBER'` laisserait passer n'importe quelle valeur inconnue jusqu'au badge — sans
 * erreur de compilation, avec « FONDATEUR » affiché à quelqu'un qui ne l'est pas. Tester la
 * seule valeur qui doit vraiment afficher quelque chose rend un rôle inconnu silencieux par
 * défaut, comme le repli `never` de `messageFor` le fait pour un message.
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  if (role !== 'FOUNDER') {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>FONDATEUR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  label: { ...type.label, color: color.text },
});
