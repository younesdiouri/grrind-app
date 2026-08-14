import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire, type LoadHook, type ResolveHook } from 'node:module';
import { fileURLToPath } from 'node:url';

/**
 * Les deux choses que Metro fait et que Node ne fait pas.
 *
 * Ce dépôt a deux exécutions hors Metro : les tests (`node --test`) et la construction des
 * previews. Les deux chargent des fichiers du client tels quels, et butent au même endroit —
 * `@/…` n'est pas un chemin pour Node, et `.tsx` n'est pas du JavaScript. Plutôt que
 * d'interdire l'alias aux modules testés ou de recopier les composants pour les previews, on
 * apprend ces règles à Node, **une fois**, ici.
 *
 * 1. `@/…` se résout comme dans `tsconfig.json`, extensions comprises.
 * 2. `react-native` se résout vers `react-native-web`. C'est *le* sens du design system : les
 *    composants natifs sont la source, la preview HTML en est dérivée. Le rendu en Node n'a
 *    pas d'autre rôle que d'appliquer cette dérivation, et surtout pas celui d'être un second
 *    endroit où le composant existe.
 * 3. Le JSX des `.tsx` passe par Babel. Les `.ts`, eux, gardent l'effacement de types intégré
 *    à Node — celui-là ne sait pas lire du JSX, et c'est sa seule limite ici.
 *
 * Ce fichier ne participe **jamais** à l'app : Metro ne le voit pas, et rien dans `src/` ne
 * l'importe. Il s'installe par `--import ./scripts/use-module-hooks.ts`.
 */

const src = new URL('../src/', import.meta.url);
const assets = new URL('../assets/', import.meta.url);
const require = createRequire(import.meta.url);

/** L'ordre est celui de Metro : le fichier exact, puis les extensions, puis l'index. */
const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function firstExisting(base: URL): string | null {
  for (const suffix of CANDIDATES) {
    const candidate = new URL(base.href + suffix);
    if (existsSync(fileURLToPath(candidate))) {
      return candidate.href;
    }
  }

  return null;
}

export const resolve: ResolveHook = async (specifier, context, next) => {
  if (specifier === 'react-native') {
    return next('react-native-web', context);
  }

  if (specifier.startsWith('@/')) {
    const relative = specifier.slice('@/'.length);
    // Les deux chemins de `tsconfig.json`, dans le même ordre : `@/assets/*` est plus
    // spécifique que `@/*` et se lit donc en premier.
    const base = relative.startsWith('assets/')
      ? new URL(relative.slice('assets/'.length), assets)
      : new URL(relative, src);

    const url = firstExisting(base);
    if (url === null) {
      throw new Error(`Aucun fichier derrière « ${specifier} » (cherché sous ${base.href}).`);
    }

    // Sans `format` : c'est Node qui décide, et c'est ainsi qu'un `.ts` garde l'effacement
    // de types intégré au lieu d'être lu comme du JavaScript.
    return { url, shortCircuit: true };
  }

  return next(specifier, context);
};

export const load: LoadHook = async (url, context, next) => {
  if (!url.endsWith('.tsx')) {
    return next(url, context);
  }

  // Chargé à la demande : aucun test ne touche un `.tsx`, et les tests ne paient donc pas
  // Babel — ni son temps de démarrage, ni sa présence.
  const babel = require('@babel/core') as typeof import('@babel/core');
  const filename = fileURLToPath(url);
  const result = await babel.transformAsync(await readFile(filename, 'utf8'), {
    filename,
    babelrc: false,
    configFile: false,
    // On n'effacera que les types et le JSX : le reste — modules, syntaxe récente — est du
    // ressort de Node, qui en sait plus que nous sur ce qu'il sait exécuter.
    presets: [[require.resolve('@babel/preset-typescript'), { isTSX: true, allExtensions: true }]],
    plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }]],
    sourceMaps: 'inline',
  });

  if (result?.code === undefined || result.code === null) {
    throw new Error(`Babel n'a rien rendu pour ${filename}.`);
  }

  return { format: 'module', source: result.code, shortCircuit: true };
};
