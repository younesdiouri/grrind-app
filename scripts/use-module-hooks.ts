import { register } from 'node:module';

/**
 * L'installation des crochets, à part — et sur le fil dédié.
 *
 * `module.registerHooks()`, plus récent et pourtant plus simple, **casse** ici : ses crochets
 * tournent dans le fil principal et passent aussi par `require()`, ce qui suffit à faire
 * échouer la détection des exports nommés de `react-native-web` (un paquet CommonJS importé
 * depuis de l'ESM). `register()` charge les crochets dans un fil séparé et laisse `require()`
 * tranquille : c'est exactement le périmètre voulu.
 *
 * C'est aussi pour ça que ce fichier ne contient que l'appel : les crochets ne peuvent pas
 * s'installer eux-mêmes sans se recharger dans leur propre fil.
 */
register('./module-hooks.ts', import.meta.url);
