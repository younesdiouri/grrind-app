# Packs de combat — génération et intégration

**Pipeline existant à retirer :** la [refonte PvE/Ālam Unity](unity-pve-alam.md)
prévoit un nouveau bestiaire 3D via Meshy et la suppression des anciens sprites.
Ne plus produire de nouveaux packs 2D ; les étapes ci-dessous décrivent les assets
encore actifs en attendant leur remplacement vérifié.

Premier lot : Cailloux (`SAND_JACKAL`) et Al-Kasal (`AL_KASAL`), les deux mobs illustrés
confirmés en lecture seule en production le 17 octobre 2026. Les autres entrées publiées
n’ont pas encore d’illustration : elles restent sur leur présentation actuelle.

## Un pack complet avant l’intégration

1. Garder la clé réelle du catalogue et une référence d’identité. Générer une garde latérale,
   tournée vers la gauche pour un mob à droite de l’arène. Le dessin garde les matières,
   proportions et couleurs du personnage ; aucune statistique ne vient de l’image.
2. Éditer cette garde pour `attack`, `hit`, `critical`, `dodge`, `combo`, `replay`, une image
   par appel ImageGen intégré. Même échelle anatomique, personnage entier, vrai alpha,
   aucun décor/texte/ombre au sol/VFX. Les prompts sont conservés à côté des packs.
3. Conserver les sources dans `artifacts/imagegen/<pack>-source/`, puis recalibrer avec
   `swift scripts/prepare-combat-art.swift <source> <destination>`. Les sept fichiers
   sources doivent être carrés et de même dimension. Le script refuse un sprite opaque
   ou vide ; il applique une échelle commune, conserve l’alpha et place les pieds à y=930
   sur un canevas 1024². Il vérifie les marges et le résultat avant d’écrire chaque PNG.
   Ce traitement ne redessine aucune partie du personnage.
4. Inspecter les sept poses ensemble sur fond sombre, puis dans le vrai composant à sa
   taille d’affichage. Contrôler la silhouette et la position du bassin entre poses :
   le recalage de sol ne corrige pas une dérive d’identité ou d’anatomie. Régénérer la pose
   fautive depuis la garde de référence plutôt que compenser une mauvaise image par du code.
5. Enregistrer un nouveau dossier versionné et les `require` statiques dans
   `bundledMobs.ts`. La résolution dans `enemyArtworkOf` conserve le nom et la réplique
   serveur. Un joueur PvP n’emprunte jamais le pack d’un mob. Un mob inconnu continue
   d’utiliser ses URL serveur à trois poses.

## Limite de ce premier lot

Les deux packs sont embarqués dans l’app. Le contrat actuel ne publie que trois poses :
la génération de sept PNG ne change pas ce contrat et ces fichiers ne sont pas automatiquement
téléversés dans l’administration. Les anciennes URL et les images frontales restent disponibles.
À la génération massive, publier les packs versionnés via le backend et faire évoluer son
contrat officiel ; retirer alors les packs embarqués. Ne pas ajouter une entrée codée en dur
pour chaque nouveau mob à grande échelle.

Les PNG générés sont cosmétiques. Le catalogue, l’éligibilité, les statistiques, la timeline
et le butin restent ceux du serveur, même après nettoyage de la BDD dev.

## Vérification

`combat-demo?mob=pebble` et l’atelier Al-Kasal affichent les sept poses hors ligne.
Le scénario réseau `opponent=pebble` utilise la même résolution et la même horloge que le
combat normal. Les URL versionnées et le cache existant restent inchangés pour les autres
adversaires. Les poses sont chargées avant le démarrage ; leur opacité change sur le thread
UI, sans chargement ni rendu React par frame.

`expo-image` conserve le redimensionnement à la taille affichée et force le redimensionnement
précoce sur iOS. Référence consultée :
https://docs.expo.dev/versions/v57.0.0/sdk/image/#enforceearlyresizing.
Le poids PNG sur disque ne représente pas la mémoire décodée : sept masters RGBA 1024²
représentent jusqu’à 28 Mio avant les autres coûts, moins lorsque le décodeur les réduit.

Réutiliser un flow ciblé via Metro et inspecter les captures, conformément à
`docs/ai/mobile-qa.md`. Ne pas modifier les sources pendant le flow ni interférer avec un
Simulator/Metro utilisé par un autre agent. Aucun rebuild natif n’est requis par ce lot.

Les [quatorze poses rendues sur iOS](proofs/mobs-side-poses.png) ont été inspectées
le 17 octobre 2026. Le flow `.maestro/al-kasal.yaml` parcourt ces poses puis les combats
victoire, défaite et Passer, jusqu’au retour à l’atelier.
