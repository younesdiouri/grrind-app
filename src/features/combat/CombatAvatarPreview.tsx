import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

/** Capture du même modèle Unity ; le moteur plein écran reste réservé au combat et à l’atelier. */
export function CombatAvatarPreview() {
  const [ready, setReady] = useState(false);
  return <Image source={require('../../../assets/images/heroes/unity/athlete.png')} style={styles.preview}
    contentFit="contain" accessible accessibilityLabel="Personnage sportif de combat" onLoad={() => setReady(true)}
    testID={ready ? 'combat-avatar-ready' : undefined} />;
}

const styles = StyleSheet.create({ preview: { width: '100%', height: '100%' } });
