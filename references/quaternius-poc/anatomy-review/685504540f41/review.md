# Revue Astra — source 685504540f41

**PASS visuel local Unity Editor pour gel et export natif. Le PASS final Simulator reste ouvert.** Aucun asset, scène ou script de production n’a été modifié par cette revue.

## Périmètre exact

Répertoire : `/Users/younesdiouri/Desktop/grrind-app/references/quaternius-poc/anatomy-review/685504540f41/`.

68 images examinées individuellement, avec JSON compagnons vérifiés FourBones :

- 36 `*-motion-persist-{player,detail}-*.png`,18 par corps,36 frames distinctes3047–5109. Garde, direct, esquive et combo, au cadrage joueur et en gros plan ; inclut combo5/.45 et esquive4/.6/.9.
- 24 `male-motion-late-{uppercut,dodge}-hem-{clay,id}-*.png`, quatre angles0/90/−90/180 pour uppercut3/.45 et esquive4/.4/.45 ;24 frames distinctes5296–6476.
- 8 `female-hem-additional-{clay,id}-0.8-*.png`, quatre angles ;8 frames distinctes6714–7059. Ces huit images concernent un candidat en mémoire, pas une géométrie persistée.

## Résultats par zone

| Zone | Femme | Homme |
| --- | --- | --- |
| Cou, col et épaules | Pas de fuite ni de nouvelle cassure visible dans les captures courantes. | Pas de fuite ni de nouvelle cassure visible dans les captures courantes. |
| Manches, bras et mains | Bras continus, sorties aux ouvertures normales. Mains devant le tissu en esquive. Combo corrigé visuellement plausible. | Bras continus, sorties aux ouvertures normales. Mains devant le tissu en esquive. Combo corrigé visuellement plausible. |
| Torse et matière | Coton chiné mat lisible, sans retour des taches de projection, du relief ondulé ou des anciennes percées. | Même résultat. |
| Ourlet | Pas de percée extérieure isolée observée. La petite pointe vers x520/y736 à4/.8/−90 subsiste avec le candidat sans intersection : elle se lit comme une finition du bord intérieur, pas comme un pantalon traversant le panneau extérieur. Réserve mineure non bloquante à cette échelle. | Les trois phases exactes précédemment manquantes passent aux quatre angles. Bord extérieur continu ; le pantalon est aperçu sous le bord relevé et derrière sa paroi proche. Aucun îlot de pantalon sur le panneau extérieur. |

Les détails combo5/.45 coupent une partie des mains sur le bord droit. Ils ne suffisent donc pas seuls à démontrer leur séparation complète. Les quatre vues entières du prototype précédent, dont les poses communes sont numériquement équivalentes, ainsi que les mesures du clip persisté complètent ce contrôle. En3/4, l’occultation partielle des mains féminines demeure naturelle.

## Croisements numériques et décision

Les intersections pantalon/tee répertoriées dans `/Users/younesdiouri/Desktop/grrind-app/artifacts/unity-spike/root-motion-hem-bind-classification.json` touchent parfois les panneaux4–26mm au-dessus de l’ourlet. Elles ne sont pas toutes des rims. Leur présence géométrique ne se traduit cependant pas par une percée extérieure lisible dans les vues courantes et celles de01232 examinées précédemment. Le PASS est visuel et limité aux preuves, il ne signifie pas « zéro intersection mathématique partout ».

`/Users/younesdiouri/Desktop/grrind-app/artifacts/unity-spike/root-motion-combo-persist-check.json` :54/54 états du clip persisté685504,0 état avec intersection main/tee, bras/bras ou pantalon/tee. Rapport d’équivalence : `root-motion-combo-persist-equivalence.json` dans le même répertoire.

Le candidat féminin ajoute un faible suivi des cuisses et supprime les12 contacts mesurés à4/.8, mais il ne supprime pas la pointe et ne procure pas de gain visuel net. **Recommandation : abandonner ce candidat ; conserver la géométrie et les UV validés.** Aucune nouvelle retopologie ni modification ample du tee masculin n’est justifiée par ces preuves.

## Limites du PASS

Ces captures sont des instants Unity Editor. Elles ne valident pas encore le rythme des gestes, les transitions continues ni le rendu du nouveau binaire installé. Le FAIL historique Simulator — doigts traversant le tee lors de l’esquive — doit être fermé par les nouvelles séquences du vrai Simulator et l’identité du binaire courant. Aucun autre doute concret bloquant n’a été identifié dans les68 images.
