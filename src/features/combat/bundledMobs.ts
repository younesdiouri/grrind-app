import type { FighterArtwork } from './enemyPresentation';

export const PEBBLE: FighterArtwork = {
  name: 'Cailloux dans la Chaussure',
  introduction: 'Un tout petit caillou… et te voilà déjà prêt à abandonner ?',
  poses: {
    idle: require('../../../assets/images/enemies/pebble/v2/idle.png'),
    attack: require('../../../assets/images/enemies/pebble/v2/attack.png'),
    hit: require('../../../assets/images/enemies/pebble/v2/hit.png'),
    critical: require('../../../assets/images/enemies/pebble/v2/critical.png'),
    dodge: require('../../../assets/images/enemies/pebble/v2/dodge.png'),
    combo: require('../../../assets/images/enemies/pebble/v2/combo.png'),
    replay: require('../../../assets/images/enemies/pebble/v2/replay.png'),
  },
};

// shortcut: premiers packs embarqués par clé stable ; passer aux packs publiés à la génération massive.
export const BUNDLED_MOBS: Readonly<Record<string, FighterArtwork>> = { SAND_JACKAL: PEBBLE };
