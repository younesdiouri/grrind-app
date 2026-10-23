# Les Guinzz — pilote de réemploi

23 octobre 2026. Demande : legging sportif coloré, homme et femme, comparable au t-shirt existant. Revérification du processus. Validation utilisateur puis autorisation de commit, push et merge le 23 octobre 2026.

Périmètre : base Quaternius existante, rig natif, trois couleurs dans l’atelier local et duel. Sans persistance backend. Un opérateur, sans génération Meshy ; plafond de 100 réponses modèle ou 90 minutes actives.

Le mesh vient des jambes natives, découpées aux chevilles et prolongées sous le tee. Les panneaux cyan et les revers sombres sont des matériaux distincts ; le tissu principal est violet, cyan ou corail. Les limites des panneaux sont découpées avant le décalage textile de 2 mm. Les poids natifs sont conservés puis limités à quatre influences. Une rentrée cachée de 8 % à la taille garde une marge sous le tee.

Corrections : association des matériaux FBX par nom ; découpe des panneaux pour supprimer les marches ; prolongement du haut à 1,15 m pour fermer le jour observé dans l’esquive féminine.

Contrôles Unity : PASS sélection original/Guinzz/fantasy, slots de matériaux, Bone4 ; qualité runtime FourBones. 44 captures finales relues (4 angles au repos et 3 phases des 6 autres gestes par corps). Typecheck, lint ciblé, 3 tests unityFrame et 29 previews passent. Export Unity Simulator, framework et host Debug réussis. UUID natif et 16 fichiers Data concordent avec le framework installé. Validation mobile finale décrite ci-dessous. La provenance et les mesures sont dans `spikes/Unity3D/Assets/Characters/LesGuinzz/PROVENANCE.json`. Les preuves sont dans `references/quaternius-poc/les-guinzz/`.

Premier parcours mobile fonctionnel : PASS en 2 min 38 s, session `2026-10-23_101528`. Revue visuelle : tissu visible hors des bottes ; ajout d’une découpe sous leur revers, sélectionnée avec les bottes. Le mesh complet reste utilisé pieds nus. La preuve finale ci-dessous couvre cette correction.

## Verdict technique du pilote

Parcours final PASS en 2 min 35 s, session `2026-10-23_102205`, après correction des bottes. Les 16 fichiers Data et l’UUID du framework installé sont vérifiés à nouveau. Deux vidéos natives de 5,67 et 5,74 secondes, relues à 6 images/s : pas de jour à la taille ni de dépassement du legging hors des bottes observé. Limite : échantillonnage visuel de l’esquive ; ce n’est pas une preuve exhaustive de toutes les transitions.

Les 44 captures Unity documentent la coupe avant l’ajout de la découpe cachée pour les bottes. `sources-final.json` et les preuves natives désignent la version finale. Revue par l’opérateur, sans sous-agent ; acceptation utilisateur : « ok bien joué donc pas mal ». Livraison Git autorisée ensuite ; aucun EAS ou changement backend. iPhone physique non testé.

Au relevé avant réponse finale : 94 réponses, 31066 tokens de sortie (raisonnement inclus), 26.7 minutes écoulées ; zéro crédit Meshy et zéro sous-agent. Le détail et les limites sont dans `usage.json`. Ce pilote respecte le plafond proposé ; la comparaison brute au tee est indicative car son périmètre était plus large.

## Conservation des preuves

Les vidéos brutes sont archivées localement dans `artifacts/avatar-customization-archive-2026-10-23/`, avec leurs chemins relatifs et un manifeste. Les planches extraites, captures finales, identités de sources et mesures restent versionnées.

Contrôles avant livraison Git : 559 tests unitaires, typecheck, lint et 29 previews passent. Validation Unity des deux prefabs : PASS. Nettoyage du shader limité au traitement `_ClothCoral`, à zéro dans tous les matériaux et jamais modifié par le runtime ; aucun changement de rendu attendu. Le parcours natif cité plus haut précède ce nettoyage et ses identités restent celles de cette preuve.
