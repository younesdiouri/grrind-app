import { useQuery } from '@tanstack/react-query';
import { useSharedValue } from 'react-native-reanimated';
import type { components } from '@/api/schema';
import { api } from '@/api/client';
import { queryOrFailure } from '@/api/queryOrFailure';
import { useAuth } from '@/features/auth/useAuth';
import { appearanceArtwork } from './appearances';
import { equippedArtwork } from './equippedArtwork';
import { DEFAULT_HERO, FighterSprite } from './FighterSprite';
import { useAppearances } from './useAppearances';

type Equipment = components['schemas']['PublicInventory']['equipment'];

/** Hors combat, le mannequin porte la sélection actuelle ; un replay utilise son propre snapshot. */
export function EquippedAvatar({ appearance, equipment }: { appearance: string; equipment: Equipment }) {
  const catalog = useAppearances();
  const clock = useSharedValue(0);
  const artwork = appearanceArtwork(catalog.data?.appearances ?? [], appearance, 'back', 'Avatar') ?? DEFAULT_HERO;
  const references = Object.fromEntries(Object.entries(equipment).flatMap(([slot, line]) => {
    if (!line) return [];
    const item = catalog.data?.equipment.find((entry) => entry.key === line.key && entry.selectable);
    return item ? [[slot, { key: line.key, artworkVersion: item.version }]] : [];
  }));
  const layers = equippedArtwork(catalog.data?.equipment ?? [], { appearance, equipment: references }, 'back');
  return <FighterSprite key={appearance + JSON.stringify(references)} artwork={artwork} equipment={layers} clock={clock} beats={[]} pose="idle" staticPreview />;
}

export function CurrentAvatar({ equipment }: { equipment: Equipment }) {
  const auth = useAuth();
  const profile = useQuery({
    queryKey: ['avatar-profile', auth.status === 'signedIn' ? auth.user.id : null],
    queryFn: () => queryOrFailure(() => api.GET('/api/me')),
    enabled: auth.status === 'signedIn', staleTime: 30_000,
  });
  const appearance = profile.data?.appearance ?? (auth.status === 'signedIn' ? auth.user.appearance : 'STRENGTH_V2');
  return <EquippedAvatar appearance={appearance} equipment={equipment} />;
}
