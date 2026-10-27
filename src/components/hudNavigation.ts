import type { Href } from 'expo-router';
import type { HudDestination } from './GameHud';

const routes: Record<HudDestination, Href> = {
  shop: '/boutique', workshop: '/atelier', appearance: '/apparence',
  bag: { pathname: '/inventaire', params: { section: 'bag' } },
};

/** Les menus secondaires se remplacent ; le sac revient aux onglets, l’apparence se referme sur son origine. */
export function openHudDestination(target: HudDestination, fromSecondary: boolean, navigation: {
  navigate(href: Href): void; dismissTo(href: Href): void;
}) {
  if (fromSecondary && target !== 'appearance') navigation.dismissTo(routes[target]);
  else navigation.navigate(routes[target]);
}
