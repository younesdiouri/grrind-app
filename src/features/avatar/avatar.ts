import type { components } from '@/api/schema';
import type { Avatar } from '@/features/combat/serverAvatar.ts';

export type AvatarCatalog = components['schemas']['AvatarCatalog'];
export type AvatarField = keyof AvatarCatalog['options'];
export const AVATAR_LABELS: { [K in AvatarField]: Record<Avatar[K], string> } = {
  body: { male: 'Homme', female: 'Femme' },
  faceStyle: { original: 'Visage fin', angular: 'Visage anguleux', oval: 'Visage ovale', heart: 'Visage en cœur', round: 'Visage rond' },
  noseStyle: { original: 'Nez original', wide: 'Nez large', aquiline: 'Nez aquilin', flat: 'Nez épaté', button: 'Nez retroussé', straight: 'Nez droit' },
  hairStyle: { parted: 'Coiffés', buns: 'Chignons', buzzed: 'Courts', mohawk: 'Crête', afro: 'Afro', long: 'Longs', ponytail: 'Queue de cheval', bob: 'Carré' },
  skinTone: { light: 'Teint clair', tan: 'Teint hâlé', brown: 'Teint brun', deep: 'Teint foncé' },
  eyeColor: { brown: 'Yeux marron', blue: 'Yeux bleus', green: 'Yeux verts' },
  hairColor: { brown: 'Cheveux châtains', black: 'Cheveux noirs', blond: 'Cheveux blonds' },
};
export const AVATAR_FIELDS = Object.keys(AVATAR_LABELS) as AvatarField[];

export function avatarOptions<K extends AvatarField>(catalog: AvatarCatalog, field: K, body: Avatar['body']): Avatar[K][] {
  return catalog.options[field].filter(option => Object.hasOwn(AVATAR_LABELS[field], option.key)
    && (field === 'body' || option.compatibleBodies.includes(body))).map(option => option.key as Avatar[K]);
}

/** Keep compatible choices; a body change only resets fields that body cannot wear. */
export function normalizeAvatar(value: Avatar | undefined, catalog: AvatarCatalog): Avatar {
  const candidate = value?.version === catalog.version ? value : catalog.default;
  const bodies = avatarOptions(catalog, 'body', candidate.body);
  const body = bodies.includes(candidate.body) ? candidate.body : catalog.default.body;
  return { version: catalog.version, ...Object.fromEntries(AVATAR_FIELDS.map(field => {
    const options = avatarOptions(catalog, field, body);
    const selected = field === 'body' ? body : options.includes(candidate[field]) ? candidate[field]
      : options.includes(catalog.default[field]) ? catalog.default[field] : options[0];
    return [field, selected];
  })) } as Avatar;
}

export function changeAvatar<K extends AvatarField>(draft: Avatar, field: K, value: Avatar[K], catalog: AvatarCatalog): Avatar {
  return normalizeAvatar({ ...draft, [field]: value }, catalog);
}
