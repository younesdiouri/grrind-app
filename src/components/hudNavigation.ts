import type { Href } from 'expo-router';
import type { HudDestination } from './GameHud';

const routes: Record<HudDestination, Href> = {
  shop: '/boutique', workshop: '/atelier',
  inventory: { pathname: '/inventaire', params: { section: 'equipment' } },
  bag: { pathname: '/inventaire', params: { section: 'bag' } },
  location: '/sport-ensemble',
};

/** Les menus secondaires se remplacent ; le personnage et le sac reviennent aux onglets. */
export function openHudDestination(target: HudDestination, fromSecondary: boolean, navigation: {
  navigate(href: Href): void; dismissTo(href: Href): void;
}) {
  if (fromSecondary) navigation.dismissTo(routes[target]);
  else navigation.navigate(routes[target]);
}
