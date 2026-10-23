# Revue Astra du vrai Simulator — 23 octobre 2026

**PASS visuel du gate Simulator sur les preuves courantes. Aucun défaut bloquant concret identifié. Le lot peut être présenté à l’auteur pour son essai personnel ; ce PASS indépendant ne remplace pas son verdict artistique final.**

## Identité des preuves

Dossier courant : `artifacts/unity-spike/simulator-motion-fit-final/`. Géométrie `32640d627d80`, matière `authored2`, clips `685504540f41`. Les rapports géométrie/matière et mouvement Editor ont été relus ; leurs limites restent explicites.

`root-native-motion-copy-identity.json` compare les 16 SHA256 Data entre build Unity, XCFramework, app Debug et app installée dans le conteneur `64C0C551-25D6-4656-B9A2-E00A68ED4F74` : tous identiques. L’UUID C++ `940ECAC0-6E8F-3390-89F2-14E40360A1C9` est inchangé ; il ne distingue pas à lui seul ce contenu de l’ancien FAIL. `boot.config`, `globalgamemanagers` et `resources.assets` diffèrent de l’ancien lot rejeté. Cette revue ne réhabilite pas les vidéos historiques de `simulator-cotton-final`.

## Méthode

Lecture indépendante des pixels extraits des vidéos, sans piloter l’app, le Simulator ou Unity, sans modification des sources et sans commit. Extractions AVFoundation à temps exacts, planches dérivées préfixées `astra-` ou `sheet-astra-`, timestamps affichés. Chaque planche a été vue. Le plein corps est revu à 6 images/s et l’esquive féminine en détail à 12 images/s, couvrant environ trois cycles par séquence. Il s’agit d’une inspection temporelle échantillonnée, pas d’une preuve mathématique pour chaque instant.

## Constats visuels

- `female-direct-full.mp4`, `female-dodge-full.mp4`, `female-combo-full.mp4` : silhouettes complètes continues, tee/manches/bras lisibles, aucun îlot de peau ni pantalon sur la face extérieure du tee dans les frames examinées.
- `female-dodge-detail.mp4` : 69 images à 12 images/s, de 0 à 5,667 s. Ancien défaut doigts dans le bas du tee absent dans les trois cycles. Aux replis maximaux (~0,667–0,833 s, 2,417–2,667 s, 4,250–4,500 s), les mains restent devant le tissu ; les transitions de retour gardent le bord de manche et le col continus. L’intérieur clair de l’ourlet se découvre sous le bord relevé, sans îlot de pantalon traversant la face extérieure.
- `male-direct-full.mp4`, `male-dodge-full.mp4`, `male-combo-full.mp4` : même contrôle à 6 images/s sur environ 5,8 s. Aucun défaut concret observé.
- `male-dodge-detail.mp4` : 35 images, 0–5,667 s. Col/clavicules/épaules stables, bras sortant par les ouvertures des manches, mains séparées du tee et ourlet continu. Pas de résurgence du cran de clavicule ni de bras traversant une paroi.
- Matière des deux corps : coton chiné mat, grain fin perceptible en détail et discret au cadrage joueur ; pas de tache de projection, reflet plastique ni changement brutal de texture entre les frames contrôlées. Les variations larges suivent les changements de pose et de lumière.

## Compléments examinés et verdict par zone

Les deux `*-combo-detail.mp4` ont été revus intégralement à 12 images/s, 69 frames par corps. Les passages croisés (féminin ~0,417–0,583 s, 2,167–2,417 s et 4–4,250 s ; masculin ~1,083–1,333 s, 2,917–3,167 s et 4,750–5 s) n’exposent ni bras coupé, ni fuite de peau dans le tee, ni nouveau pic de manche. Une partie des mains sort du cadre détail à l’extension maximale : les séquences plein corps complètent cette lecture, ainsi que les mesures Editor déjà documentées ; aucune vue tronquée n’est présentée comme preuve complète d’une main invisible.

| Zone | Femme | Homme |
| --- | --- | --- |
| Cou / col / clavicules | PASS : raccord continu, pas d’îlot de peau ni bosse nouvelle | PASS : aucun retour du cran de clavicule |
| Épaules / manches | PASS : silhouettes et ouvertures continues | PASS : bras sortant des ouvertures, aucune percée de paroi |
| Bras / mains devant le tee | PASS : ancien FAIL d’esquive absent sur les nouvelles séquences | PASS : aucun défaut dans direct/esquive/combo revus |
| Ourlet / pantalon | PASS visuel : intérieur visible sous le bord, sans percée extérieure | PASS visuel : contour continu et pantalon derrière/sous l’ouverture |
| Matière | PASS : chiné mat lisible en détail, discret au jeu | PASS : même comportement |
| Garde d’arène | PASS au cadrage du duel | PASS au cadrage du duel |

`duel-and-return.mp4` dure 54,887 s. Les 109 frames à 2 images/s ont été vues en planches ; les états 8 s, 9,5 s, 11 s, 13,5 s et 18 s ont aussi été vus individuellement après rotation de lecture (`astra-duel-upright-*.png`). Le masculin ardoise et le féminin corail sont présents en garde d’arène, puis en combat. Les manches, cols, bras et ourlets restent lisibles au cadrage du jeu. La victoire apparaît vers 20 s ; l’atelier portrait revient vers 30,5 s et demeure affiché jusqu’à la fin. `return-portrait-before-device-rotation.png` confirme le contenu portrait avant réorientation du pilote ; `final-manual-state.png` confirme l’atelier féminin en T-shirt sport Ardoise/Tissu.

## Ancien FAIL fermé et limites

L’ancien lot `simulator-cotton-final` reste **FAIL historique** pour les doigts féminins traversant le bas du tee. Le nouveau lot comporte les clips ajustés, identifiés par les ressources Data, et ne reproduit pas ce défaut dans les cycles examinés. Ce sont ces nouvelles preuves qui ferment le gate mobile, pas la seule réussite d’installation ou une image statique Editor.

La revue est échantillonnée : elle ne revendique pas zéro intersection mathématique ni contrôle image par image de chaque frame vidéo. Les vues mobile sont principalement à trois quarts ; les profils/dos et les sept gestes statiques reposent sur le gate Editor applicable, sans prétendre avoir été tous recapturés ici. Les petites réserves d’ourlet déjà classées dans `685504540f41/review.md` ne sont pas réinterprétées en défaut nouveau sans preuve.

Un bandeau de développement « Refreshing… » apparaît à plusieurs instants du duel ; les PV et l’action continuent jusqu’à la victoire. La capture démontre le parcours et les pixels présents, mais ne certifie pas une session sans Fast Refresh ni la cadence temps réel. Aucun scintillement brutal du textile n’apparaît dans les frames inspectées ; une mesure instrumentée de performance n’a pas été effectuée.

Aucune source, scène ou asset de production modifié par cette revue. Aucun commit. Seuls ce rapport et les dérivés d’analyse ont été écrits. Tous les chemins sont relatifs à `/Users/younesdiouri/Desktop/grrind-app`.



---

## Addendum Astra — capture ciblée sans écritures dans le dépôt

**PASS de la vérification ciblée : le parcours duel → victoire → retour portrait s’affiche sans bandeau Refreshing dans les frames examinées. PASS visuel asset maintenu.**

Preuve : `/tmp/grrind-motion-stable/duel-stable.mp4`, durée 39,82 s. Extrait à 2 images/s avec AVFoundation ; 79 frames de 0 à 39 s examinées dans sept planches `/tmp/grrind-motion-stable/sheet-*.jpg`. Les frames 6,5 s, 9 s, 18,5 s et 19 s ont aussi été inspectées individuellement après rotation de lecture (`upright-013.png`, `upright-018.png`, `upright-037.png`, `upright-038.png`). Tous les dérivés et cet addendum ont été écrits hors dépôt après la fin de l’enregistrement.

- À 6 s, seule la combattante de gauche est encore visible pendant l’entrée. Dès 6,5 s les deux acteurs sont présents : femme ardoise à gauche, homme corail à droite. Ils restent présents pendant le combat, en garde et lors des échanges ; aucun combat avec un acteur durablement absent n’est observé.
- À 18,5 s, le résultat Victoire apparaît en fondu devant les deux personnages encore visibles. À 19 s, le panneau de résultat devenu opaque les masque. Le sol reste visible dessous : ce n’est pas un écran noir de combat. Résultat 38/159 contre 0/150, puis retour atelier portrait vers 37,5 s.
- Aucun bandeau « Refreshing… » observé dans ces 79 frames ; aucune réinitialisation des PV ou du parcours constatée. Cela ferme le doute concret introduit par la capture précédente. Le lien causal avec les écritures d’artefacts dans le dépôt est plausible, sans être démontré par un diagnostic Metro.
- Aucun nouveau défaut de col, épaule, manche, bras/main ou ourlet observé au cadrage de ce duel. Cette capture complète les détails atelier déjà revus ; elle ne les remplace pas.

Ce contrôle reste une inspection visuelle ciblée à 2 images/s, pas une mesure de performance ni une garantie frame par frame. Aucun changement de source et aucun commit. Le lot peut être présenté à l’auteur pour essai ; sa validation personnelle reste distincte du PASS Astra.
