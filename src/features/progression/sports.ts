import type { components } from '@/api/schema';

export type SportCatalog = components['schemas']['SportCatalog'];
export type SportEntry = components['schemas']['SportCatalogEntry'];

const searchable = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr-FR').trim();

export function filterSports(entries: SportEntry[], search: string): SportEntry[] {
  const query = searchable(search);
  return entries.filter(entry => [entry.name, ...entry.aliases].some(value => searchable(value).includes(query)));
}
