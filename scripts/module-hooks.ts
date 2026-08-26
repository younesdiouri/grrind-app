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
 *
 * ————— `react-native-svg`, le même problème posé quatre fois de plus ——————————————————————
 *
 * `AttributeRing` (#69) dessine des arcs, donc importe `react-native-svg`. Metro sait choisir
 * son build web ; Node, laissé seul, suit le champ `main` du paquet — du CommonJS qui
 * `require()` le vrai `react-native` et boit du Flow (`Unexpected token 'typeof'`). Un spike a
 * vérifié ce chemin de bout en bout ; il tient en quatre règles, chacune pour le symptôme
 * qu'elle corrige :
 *
 * 4. `react-native-svg` se résout vers son build web, `lib/module/ReactNativeSVG.web.js` —
 *    jamais vers `main` (CommonJS, `require('react-native')`) ni vers le champ `react-native`
 *    du paquet (ses sources TypeScript, que Node ne sait pas lire).
 * 5. À l'intérieur du paquet, un import relatif sans extension préfère son `.web.js` à son
 *    `.js` (`elements.web.js` porte les primitives DOM, `elements.js` les vues natives) — et
 *    Node doit d'abord apprendre à résoudre l'absence d'extension elle-même, qu'il ne fait
 *    jamais pour un specifier ESM.
 * 6. Un specifier **nu** sans extension retombe sur `.js` : `@react-native/assets-registry`
 *    n'a pas de champ `main`, et le build web du paquet l'importe par son sous-chemin
 *    (`@react-native/assets-registry/registry`) sans le préciser.
 * 7. `lib/extract/transformToRn.js` est un analyseur généré par Peggy, en CommonJS
 *    (`module.exports = { parse, ... }`). Son export nommé échappe à la détection statique de
 *    Node (« is a CommonJS module, which may not support all module.exports as named
 *    exports ») : on le recharge donc par `require()`, qui n'a pas ce problème, et on
 *    réexpose ses clés en ESM à la main.
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

/** `react-native-svg` : la règle 4, un seul spécificateur à rediriger vers son build web. */
const REACT_NATIVE_SVG_ENTRY = 'react-native-svg/lib/module/ReactNativeSVG.web.js';

/** Le fichier de la règle 7, quel que soit le chemin (relatif ou déjà résolu) qui y mène. */
const TRANSFORM_TO_RN_SUFFIX = '/lib/extract/transformToRn.js';

/** Une extension de fichier, au sens le plus simple : un point dans le dernier segment. */
function hasExtension(specifier: string): boolean {
  return (specifier.split('/').pop() ?? '').includes('.');
}

export const resolve: ResolveHook = async (specifier, context, next) => {
  if (specifier === 'react-native') {
    return next('react-native-web', context);
  }

  // Règle 4 : le seul specifier `react-native-svg` de tout le dépôt à ne pas laisser à `next`.
  if (specifier === 'react-native-svg') {
    return next(REACT_NATIVE_SVG_ENTRY, context);
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

  // Règle 5 : dans `react-native-svg` seulement — un import relatif d'ailleurs dans le dépôt
  // porte toujours son extension, `@/` s'en charge.
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !hasExtension(specifier) &&
    context.parentURL?.includes('/node_modules/react-native-svg/')
  ) {
    const base = new URL(specifier, context.parentURL);
    // Un dossier (`./web/utils`) n'a pas de `.web.js` propre — seul son `index.js` existe.
    // L'ordre reste celui de Metro : le `.web.js` du fichier, puis son `.js`, puis les mêmes
    // deux nommées à l'intérieur du dossier.
    for (const suffix of ['.web.js', '.js', '/index.web.js', '/index.js']) {
      const candidate = `${base.href}${suffix}`;
      if (existsSync(fileURLToPath(candidate))) {
        return next(candidate, context);
      }
    }
    // Aucune des quatre variantes n'existe : on laisse `next` échouer avec son message, plus
    // précis que ce que cette règle pourrait inventer.
  }

  // Règle 6 : un specifier nu, sans extension, qui ne se résout pas tel quel. `next` échoue
  // vite (pas de requête réseau, pas d'I/O coûteuse) : essayer d'abord coûte moins qu'un
  // second garde-fou sur le nom du paquet.
  if (!specifier.startsWith('.') && !specifier.startsWith('@/') && !hasExtension(specifier)) {
    try {
      return await next(specifier, context);
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ERR_MODULE_NOT_FOUND') {
        throw error;
      }
      return next(`${specifier}.js`, context);
    }
  }

  return next(specifier, context);
};

export const load: LoadHook = async (url, context, next) => {
  // Règle 7 : `require()` lit `module.exports = { parse, ... }` sans mal — c'est l'analyse
  // statique de l'ESM qui échoue à trouver ses exports nommés. On rejoue donc le fichier par
  // `require()` et on réexpose ses clés à la main, en ESM.
  if (url.endsWith(TRANSFORM_TO_RN_SUFFIX)) {
    const filename = fileURLToPath(url);
    const exported = require(filename) as Record<string, unknown>;
    const names = Object.keys(exported);
    const source = [
      `import { createRequire } from 'node:module';`,
      `const mod = createRequire(import.meta.url)(${JSON.stringify(filename)});`,
      ...names.map((name) => `export const ${name} = mod[${JSON.stringify(name)}];`),
      `export default mod;`,
    ].join('\n');

    return { format: 'module', source, shortCircuit: true };
  }

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
