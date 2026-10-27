# #314 — Réglages sans avatar

Ticket : https://github.com/younesdiouri/grrind-app/issues/314

- [x] Retirer la carte Ton personnage et le raccourci Atelier avatar 3D.
- [x] Retirer leur requête d’inventaire, imports et style ; conserver le profil et son
  rechargement pour les notifications.
- [x] TypeScript/lint sur le code final, 608 tests et 31 previews déterministes.
- [ ] Validation auteur sur iPhone avec #315/#316.

Changement de présentation React Native uniquement. Aucun changement de l’éditeur,
de ses sauvegardes, du serveur ou du binaire natif. Vérification locale ciblée :
`rtk proxy npx eslint 'src/app/(app)/(tabs)/reglages.tsx'`.
