import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Les previews HTML du design system — **dérivées**, jamais écrites.
 *
 * ————— Le sens unique —————————————————————————————————————————————————————————————————
 *
 * Les composants React Native sont la source de vérité. Ce script les rend avec
 * `react-native-web` et écrit un HTML statique par composant : la preview ne peut donc pas
 * diverger sans que quelqu'un l'ait fait exprès. L'inverse — dessiner en HTML puis traduire
 * vers RN — coûterait une traduction CSS → RN sur chaque composant, à vie : React Native n'a
 * ni cascade, ni `flexDirection: row` par défaut, ni ombre portable.
 *
 * Chaque fichier s'ouvre sur `<!-- @dsCard group="…" -->`. C'est ce marqueur, et rien
 * d'autre, qui range la carte dans le volet Design System à la synchronisation (#8).
 *
 * ————— Ce que le script ne fait pas ———————————————————————————————————————————————————
 *
 * Il n'assemble aucun écran. Une carte montre **un** composant dans ses états ; les écrans
 * sont l'affaire des maquettes, qui viendront composées de ces composants-là.
 *
 * Les imports sont dynamiques parce que les crochets de module (`@/…`, `react-native` →
 * `react-native-web`) s'installent avant l'exécution mais après la résolution des imports
 * statiques de ce fichier. Voir `scripts/module-hooks.ts`.
 */

const OUT = new URL('../previews/', import.meta.url);

const [
  { AppRegistry },
  { renderToStaticMarkup },
  { PAGE_WIDTH, Page, PREVIEWS },
  { color },
  react,
] = await Promise.all([
  import('react-native-web'),
  import('react-dom/server'),
  import('@/design/previews'),
  import('@/design/tokens'),
  import('react'),
]);

const rendered = PREVIEWS.map((preview) => {
  AppRegistry.registerComponent(preview.slug, () => () =>
    react.createElement(Page, null, preview.element),
  );

  const { element } = AppRegistry.getApplication(preview.slug);

  return { preview, markup: renderToStaticMarkup(element) };
});

// La feuille de style de `react-native-web` est **globale** : elle se lit une fois, à la fin,
// quand tous les spécimens ont été rendus. Chaque fichier porte donc la même, complète — une
// carte reste ouvrable seule, et deux exécutions rendent le même octet.
const stylesheet = renderToStaticMarkup(
  AppRegistry.getApplication(PREVIEWS[0].slug).getStyleElement(),
);

function page(name: string, group: string, markup: string): string {
  return `<!-- @dsCard group="${group}" -->
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=${PAGE_WIDTH}, initial-scale=1" />
    <title>GRRIND — ${name}</title>
    <!-- Généré par \`npm run previews\` depuis les composants React Native. Ne pas éditer. -->
    ${stylesheet}
    <style>html,body{background-color:${color.background};}</style>
  </head>
  <body>${markup}</body>
</html>
`;
}

await mkdir(OUT, { recursive: true });

// Un composant supprimé doit voir sa carte disparaître : sans ce ménage, la preview
// survivrait au composant et la synchronisation la republierait indéfiniment.
const known = new Set(PREVIEWS.map((preview) => `${preview.slug}.html`));
for (const entry of await readdir(OUT)) {
  if (!known.has(entry)) {
    await rm(new URL(entry, OUT));
  }
}

for (const { preview, markup } of rendered) {
  await writeFile(new URL(`${preview.slug}.html`, OUT), page(preview.name, preview.group, markup));
}

console.log(`${rendered.length} previews écrites dans ${fileURLToPath(OUT)}`);
