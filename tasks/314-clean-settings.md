# #314 — Réglages sans avatar

Ticket : https://github.com/younesdiouri/grrind-app/issues/314

- [x] Retirer la carte Ton personnage et le raccourci Atelier avatar 3D.
- [x] Retirer leur requête d’inventaire, imports et style ; conserver le profil et son
  rechargement pour les notifications.
- [x] TypeScript/lint sur le code final, 608 tests et 31 previews déterministes.
- [x] Validation auteur sur iPhone ; livraison autorisée le 28 octobre.

Changement de présentation React Native uniquement. Aucun changement de l’éditeur,
de ses sauvegardes, du serveur ou du binaire natif. Vérification locale ciblée :
`rtk proxy npx eslint 'src/app/(app)/(tabs)/reglages.tsx'`.

## Validation et livraison — 28 octobre

L’auteur valide la version installée : « franchement mon gars vraiment bien joué c’est vraiment lourd. Tu peux push main merge déployer etc. que ça soit back ou front tu gères ».
L’interdiction de push est levée pour ce lot ; fusionner les trois tickets puis lancer
un build EAS production et sa soumission TestFlight. TypeScript/lint, 608 tests et
31 previews passent sur le code final. La vérification du candidat de production
reste distincte de cette validation du development build.
