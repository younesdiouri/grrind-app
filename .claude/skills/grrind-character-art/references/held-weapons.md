# Armes et objets tenus

Choisir un pilote de même prise : `docs/design/le-poids-lourd-pilot.md` pour l’haltère,
`docs/design/sports-weapons.md` et `docs/design/sword-guard/` pour les armes de sport.
Réutiliser `WeaponGrip`, ses poses de doigts et les mouvements compatibles.

Définir au brief poignée, axe, diamètre, main porteuse, volume de l’objet et famille de coups.
Mesurer ces éléments sur les vraies mains homme/femme : un point d’attache partagé plaçait
autrefois l’haltère devant le poing féminin. Les doigts doivent entourer la poignée, avec
pouce opposé, sans modifier le corps pour masquer une mauvaise prise.

Importer le mesh dans son orientation avant d’affiner la prise. Préserver géométrie et UV
après texturation ; adapter localement la poignée dans un script si la construction le permet.
Pour une prise à deux mains, contrôler aussi le support et ses doigts avec le rig existant.

Vérifier la prise au repos, au contact **et dans le retour** des coups réellement utilisés.
Inclure tête, avant-bras, main libre et sol lorsque le volume peut les atteindre. Le Poids
Lourd touchait la tête au retour et la main libre pendant l’uppercut malgré un contact lisible.
Une pose fixe correcte n’est donc pas une validation d’animation.

Exécuter les validations d’équipement et de mouvements concernées, sans balayer les armes,
caméras et gestes inchangés. Un nouveau volume ou une nouvelle prise justifie des contrôles
supplémentaires ciblés. Conserver les limites connues et le périmètre d’essai accepté ;
ne pas annoncer « sans collision » sur la seule base d’une capture.

Dans le pilote d’atelier, vérifier sélection/retrait, exclusion avec les gants et changement
de corps. L’auteur juge sur iPhone la prise, le poids perçu, la silhouette et les coups.
