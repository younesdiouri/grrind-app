# Prises cylindriques Quaternius

Poses locales XYZW des quinze phalanges droites, ajustées dans Unity le 23 octobre 2026
pour une poignée de 25 mm. Sources : rigs Quaternius du projet ; pas de génération de mesh.
Chaque ligne contient le nom d’os puis son quaternion local. Les proportions homme/femme
exigent des poses et un point d’attache propres, même quand les noms d’os sont identiques.

`WeaponGrip` conserve les rotations après échantillonnage de l’animation du bras. Le prefab
porte l’objet sous `hand_r` ; `LePoidsLourd.Build` importe les poses et place son pivot central :

- Homme : (0.023, 0.099, 0) m.
- Femme : (0.020, 0.070, 0) m.
- Axe du manche : normalize(0, 0.24, 1), dans le repère local de la main.

Pour un autre manche : réutiliser le composant, placer le pivot de prise dans la paume,
choisir la pose adaptée au corps et au diamètre, puis vérifier les quatre doigts et le pouce
en vues paume/profil/dos. La rotation de l’arme autour du manche dépend de sa lame ou de sa
masse. Un diamètre différent demande une nouvelle calibration ; ces valeurs ne sont pas
une solution automatique pour toutes les armes. Les gestes du bras sont indépendants.

La vérification d’enroulement dans `LePoidsLourd.Validate` détecte une poignée en dehors
des doigts. Elle ne mesure pas les intersections de surface : les captures restent nécessaires.
