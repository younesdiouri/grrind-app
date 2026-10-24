# Combat 1v1 : rythme et présentation Unity — #265

## Objectif validé

Rendre les actions automatiques lisibles comme des tours, attacher les effets aux personnages
et célébrer le résultat dans la scène. Solo existant, PvP et rejeux utilisent les événements,
PV et gains du serveur sans changer leur ordre ni les règles. Aucun push avant la vérification
personnelle de l’auteur sur Simulator. Aucun build EAS.

## Tranches et acceptation

1. **Rythme.** Action ordinaire de 1 300 ms, annonce de combo courte et relance resserrée.
   Préparation, contact vif, réaction, retour en garde puis respiration. Les combats longs
   gardent ce rythme ; ×2 et Passer permettent de les écourter. Les effets disparaissent au
   saut, les PV et résultats restent exacts.
2. **Unity.** Le pont existant transporte les valeurs de présentation de l’horloge unique.
   Unity dessine chiffres, impacts et effets sur les positions projetées des personnages,
   ainsi que le HUD fixe néon facetté. Les textes suivent les personnages mais restent face
   à la caméra. Les illustrations PvE restantes conservent un ancrage dans leur cadre actuel.
3. **Finale.** Le vainqueur reste visible, le cadre et le titre arrivent avec une animation
   courte. Les gains serveur apparaissent ensuite ; les fiches de butin, le bilan détaillé,
   les commandes et l’accessibilité restent en RN. Une fin à la limite ne simule pas de KO.
4. **Preuve.** Compiler/exporter Unity pour le Simulator, reconstruire seulement le dev build
   concerné, jouer un parcours pertinent et inspecter les captures. Laisser une démo jouable
   à l’auteur avant tout push.

## Fichiers et conventions

Timeline et pont purs dans `src/features/combat/`, tests Node voisins ; rendu uGUI dans
`spikes/Unity3D/Assets/Spike/`. Réutiliser Oxanium et les couleurs néon existantes, sans nouvelle
dépendance. Exemple : `sampleRamp(timeline.enemy.hp, time)` lit la valeur serveur déjà animée.
Le cadre des illustrations et le raid ne sont pas remplacés ici (#249/#251).

## Vérification

Tests ciblés via `node --test --import ./scripts/use-module-hooks.ts src/features/combat/*.test.ts`
(avec les options Node du script npm). À la fin : `npm run typecheck`, `npm run lint`, `npm test`
et `npm run previews:check`. Export Simulator avec le CLI officiel Unity et
`MobileBuild.Simulator`, puis `npm run e2e:ios:dev` et le parcours de présentation approprié,
selon `docs/ai/mobile-qa.md`. Aucun changement du backend ni du contrat API.

Sources : [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[uGUI 2.0 Canvas](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/class-Canvas.html),
[CanvasScaler](https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html)
et [projection Unity 6000.3](https://docs.unity3d.com/6000.3/Documentation/ScriptReference/Camera.WorldToScreenPoint.html).
Les mouvements réduits retirent les déplacements, secousses et
particules tout en conservant les valeurs et les annonces lisibles.

## Vérification locale du 24 octobre 2026

- Types, lint, 587 tests Node et 29 previews : verts sur le code final.
- Export Unity Simulator et development build Debug : verts. Le framework installé porte
  l’UUID `263DB847-3935-3474-AB5D-779A64BFC6A9`, identique à l’export.
- `E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/combat-3d.yaml` : vert en 3 min 37 s.
  Huit effets/camps, limite sans KO, Passer, lecture naturelle PvP à ×2, victoire et défaite
  PvE, détails et retour portrait ; captures inspectées (`2026-10-24_160657`). Aucun compte créé.
- `E2E_OFFLINE=1 npm run e2e:ios:flow -- .maestro/combat-loot-preview.yaml` : vert en 65 s.
  La capture HTTP annonce 6 pièces et 1 objet ; la finale Unity et le bilan RN montrent ces
  mêmes valeurs, sans crédit réel (`2026-10-24_161445`). L’aperçu reste accessible sans session
  depuis « Aperçu victoire et butin » dans l’atelier.
- Captures paysage de 2622 × 1206 px. L’effet est ancré au corps, le nombre au-dessus de la
  tête. Le premier cadrage est re-mesuré après la rotation ; les captures suivantes confirment
  la même échelle. Aucun message d’erreur du bridge dans le journal iOS du parcours final.

Le premier essai natif a exposé une collision de noms avec UnitySendMessage : les méthodes
du composant de rendu se nomment désormais `Setup`/`DrawFrame`, seuls `BattleBridge.Configure`
et `BattleBridge.Present` reçoivent les messages JSON. Le protocole a été rejoué dans l’éditeur
avec `GameObject.SendMessage` avant le nouvel export, puis vérifié sur Simulator.

VoiceOver et les grands réglages de texte conservent le HUD RN accessible. Le prochain contrôle
sur iPhone physique demande un export Unity Device ; seul le Simulator a été reconstruit ici.
Le verdict artistique de l’auteur reste attendu sur Simulator. Aucun push, PR, merge ou EAS.

![Critique centré sur la cible](combat-presentation/critical.png)
![Esquive centrée sur le défenseur](combat-presentation/dodge.png)
![Victoire et gains de la fixture](combat-presentation/victory-gains.png)
